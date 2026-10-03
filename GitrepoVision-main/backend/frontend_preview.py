import json
from pathlib import PurePosixPath


BACKEND_SIGNAL_FILES = {
    "server.js",
    "app.py",
    "main.py",
    "manage.py",
    "wsgi.py",
    "pom.xml",
    "build.gradle",
    "gradle.build",
    "requirements.txt",
}


def _safe_json_loads(content):
    try:
        return json.loads(content)
    except Exception:
        return {}


def _find_blob_paths(files):
    return [f.get("path", "") for f in files if f.get("type") == "blob"]


def _find_tree_paths(files):
    return [f.get("path", "") for f in files]


def _read_package_dependencies(owner, repo, files, get_file_content_fn):
    package_path = None
    for file in files:
        path = file.get("path", "")
        if file.get("type") == "blob" and PurePosixPath(path).name.lower() == "package.json":
            package_path = path
            break

    if not package_path:
        return set()

    content = get_file_content_fn(owner, repo, package_path)
    if not content:
        return set()

    data = _safe_json_loads(content)
    deps = data.get("dependencies", {}) or {}
    dev_deps = data.get("devDependencies", {}) or {}
    all_deps = {**deps, **dev_deps}
    return {key.lower() for key in all_deps.keys()}


def _detect_project_type(owner, repo, files, get_file_content_fn):
    blob_paths = _find_blob_paths(files)
    tree_paths = _find_tree_paths(files)
    normalized_blob = [p.lower() for p in blob_paths]
    normalized_tree = [p.lower() for p in tree_paths]

    has_root_index = "index.html" in normalized_blob

    root_index_content = ""
    if has_root_index:
        root_index_content = get_file_content_fn(owner, repo, "index.html") or ""
    has_source_entry = (
        ("src/" in root_index_content.lower() and "type=\"module\"" in root_index_content.lower())
        or any(path.lower() in {"src/main.jsx", "src/main.tsx", "vite.config.js", "vite.config.ts"} for path in blob_paths)
    )

    build_index_path = None
    for candidate in ("dist/index.html", "build/index.html"):
        if candidate in normalized_blob:
            build_index_path = candidate
            break

    has_build_dir = any(path.startswith("build/") or path.startswith("dist/") for path in normalized_tree)
    package_deps = _read_package_dependencies(owner, repo, files, get_file_content_fn)
    has_framework = any(dependency in package_deps for dependency in {"react", "vue", "vite", "@vitejs/plugin-react"})

    has_backend_files = any(PurePosixPath(path).name.lower() in BACKEND_SIGNAL_FILES for path in blob_paths)

    if has_framework or has_source_entry:
        return "framework", None
    if has_root_index:
        return "static", "index.html"
    if has_build_dir:
        return "built", build_index_path
    if has_backend_files:
        return "backend", None
    return "backend", None


def build_frontend_preview_metadata(owner, repo, files, get_file_content_fn):
    project_type, entry_path = _detect_project_type(owner, repo, files, get_file_content_fn)
    repo_url = f"https://github.com/{owner}/{repo}"

    preview_available = project_type in {"static", "built", "framework"}

    preview_url = None
    if project_type in {"static", "built"} and entry_path:
        preview_url = f"https://cdn.jsdelivr.net/gh/{owner}/{repo}@HEAD/{entry_path}"

    stackblitz_url = f"https://stackblitz.com/github/{owner}/{repo}"

    return {
        "projectType": project_type,
        "previewAvailable": preview_available,
        "repoUrl": repo_url,
        "previewUrl": preview_url,
        "stackblitzUrl": stackblitz_url,
    }
