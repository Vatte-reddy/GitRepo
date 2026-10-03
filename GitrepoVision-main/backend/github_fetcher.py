import requests
import base64
import os
import io
import zipfile
from pathlib import Path

# Load .env from the backend directory
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).parent / ".env")
except ImportError:
    pass  # python-dotenv not installed, fall back to system env vars

GITHUB_API = "https://api.github.com"

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
LAST_GITHUB_ERROR = ""
ARCHIVE_FILE_CACHE = {}

def _headers():
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers

def _get_default_branch(owner, repo):
    url = f"{GITHUB_API}/repos/{owner}/{repo}"
    response = requests.get(url, headers=_headers())
    if response.status_code == 200:
        return response.json().get("default_branch", "main")
    return "main"

def get_repo_files(owner, repo, branch=None):
    global LAST_GITHUB_ERROR
    LAST_GITHUB_ERROR = ""
    if branch is None:
        branch = _get_default_branch(owner, repo)

    url = f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
    response = requests.get(url, headers=_headers())

    if response.status_code != 200:
        print(f"[github_fetcher] Error {response.status_code}: {response.text}")
        archive_files = _get_archive_files(owner, repo, branch)
        if archive_files is not None:
            return archive_files
        if response.status_code == 403 and response.json().get("message") == "API rate limit exceeded":
            LAST_GITHUB_ERROR = "GitHub API rate limit exceeded. Set GITHUB_TOKEN in backend/.env and restart the Flask server."
        else:
            LAST_GITHUB_ERROR = f"GitHub returned HTTP {response.status_code} while fetching the repository."
        return None

    data = response.json()
    return data.get("tree", [])


def _get_archive_files(owner, repo, branch):
    archive_url = f"https://github.com/{owner}/{repo}/archive/refs/heads/{branch}.zip"
    try:
        response = requests.get(archive_url, timeout=30)
        response.raise_for_status()
        files = []
        contents = {}
        with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
            names = [name for name in archive.namelist() if not name.endswith("/")]
            prefix = names[0].split("/", 1)[0] if names else ""
            for name in names:
                path = name.split("/", 1)[1] if prefix and name.startswith(f"{prefix}/") else name
                contents[path] = archive.read(name)
                files.append({"path": path, "type": "blob"})
        ARCHIVE_FILE_CACHE[(owner, repo)] = contents
        print(f"[github_fetcher] Using public archive fallback for {owner}/{repo}")
        return files
    except (requests.RequestException, zipfile.BadZipFile, UnicodeDecodeError) as error:
        print(f"[github_fetcher] Archive fallback failed: {error}")
        return None


def get_last_github_error():
    return LAST_GITHUB_ERROR

def get_file_content(owner, repo, path):
    cached_content = ARCHIVE_FILE_CACHE.get((owner, repo), {}).get(path)
    if cached_content is not None:
        return cached_content.decode("utf-8", errors="replace")

    url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"
    response = requests.get(url, headers=_headers())

    if response.status_code != 200:
        return None

    content = response.json().get("content")
    if not content:
        return None

    decoded = base64.b64decode(content).decode("utf-8")
    return decoded

def update_file_content(owner, repo, path, updated_code, commit_message):
    url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"
    
    # Check existing to get sha
    response = requests.get(url, headers=_headers())
    sha = None
    if response.status_code == 200:
        sha = response.json().get("sha")
    elif response.status_code != 404:
        return {"error": "Failed to fetch original file to get SHA"}, response.status_code

    payload = {
        "message": commit_message,
        "content": base64.b64encode(updated_code.encode("utf-8")).decode("utf-8")
    }
    if sha:
        payload["sha"] = sha
        
    put_response = requests.put(url, headers=_headers(), json=payload)
    return put_response.json(), put_response.status_code

def push_fix_to_branch(owner, repo, path, updated_code, commit_message):
    branch_name = "gitrepovision-fix"
    default_branch = _get_default_branch(owner, repo)

    # 1. Check if branch exists
    ref_url = f"{GITHUB_API}/repos/{owner}/{repo}/git/ref/heads/{branch_name}"
    ref_res = requests.get(ref_url, headers=_headers())

    if ref_res.status_code == 200:
        pass # Branch exists
    else:
        # 2. Get default branch SHA
        default_ref_url = f"{GITHUB_API}/repos/{owner}/{repo}/git/ref/heads/{default_branch}"
        default_res = requests.get(default_ref_url, headers=_headers())
        if default_res.status_code != 200:
            return {"error": "Failed to get default branch SHA for branching"}, default_res.status_code
        
        main_sha = default_res.json().get("object", {}).get("sha")
        
        # 3. Create new branch
        create_ref_url = f"{GITHUB_API}/repos/{owner}/{repo}/git/refs"
        create_res = requests.post(create_ref_url, headers=_headers(), json={
            "ref": f"refs/heads/{branch_name}",
            "sha": main_sha
        })
        if create_res.status_code not in (201, 200):
            # If creation failed, fallback to main/default branch or report error
            return {"error": "Failed to create new branch"}, create_res.status_code

    # 4. Get file SHA on the new branch
    file_url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}?ref={branch_name}"
    file_res = requests.get(file_url, headers=_headers())

    sha = None
    if file_res.status_code == 200:
        sha = file_res.json().get("sha")
        
    payload = {
        "message": commit_message,
        "content": base64.b64encode(updated_code.encode("utf-8")).decode("utf-8"),
        "branch": branch_name
    }
    if sha:
        payload["sha"] = sha
        
    # 5. Commit file update
    put_url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"
    put_response = requests.put(put_url, headers=_headers(), json=payload)
    
    return put_response.json(), put_response.status_code


EXCLUDED_TREE_DIRS = {".git", "node_modules", "__pycache__", "venv", ".venv", ".idea", ".vscode", "dist", "build"}


def build_tree(flat_tree):
    """Convert a flat GitHub git-tree list into a nested folder/file JSON structure."""
    root = {"name": "root", "type": "folder", "children": []}

    def get_or_create_folder(parent, name):
        for child in parent["children"]:
            if child["type"] == "folder" and child["name"] == name:
                return child
        new_folder = {"name": name, "type": "folder", "children": []}
        parent["children"].append(new_folder)
        return new_folder

    for item in flat_tree:
        path = item.get("path", "")
        item_type = item.get("type", "")
        parts = path.split("/")

        # Skip excluded directories
        if any(part in EXCLUDED_TREE_DIRS for part in parts):
            continue

        current = root
        for i, part in enumerate(parts):
            is_last = i == len(parts) - 1
            if is_last:
                if item_type == "blob":
                    current["children"].append({"name": part, "type": "file"})
                else:
                    get_or_create_folder(current, part)
            else:
                current = get_or_create_folder(current, part)

    # Sort: folders first, then files, both alphabetically
    def sort_children(node):
        if "children" in node:
            node["children"].sort(key=lambda x: (0 if x["type"] == "folder" else 1, x["name"].lower()))
            for child in node["children"]:
                sort_children(child)

    sort_children(root)
    return root
