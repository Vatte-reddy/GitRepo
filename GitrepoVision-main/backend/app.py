from flask import Flask, request, jsonify
from flask_cors import CORS
from collections import Counter
from github_fetcher import get_repo_files, get_file_content, build_tree, get_last_github_error
from analyzer import analyze_code
from scoring import calculate_risk_score, classify_risk
from repository_summary import build_repository_summary
from frontend_preview import build_frontend_preview_metadata
from ai_agent import generate_ai_fix
from github_fetcher import update_file_content, push_fix_to_branch

app = Flask(__name__)
# Allow CORS for development so frontend (on any localhost port) can reach the API.
# In production, restrict origins appropriately.
CORS(app)

EXCLUDED_DIRS = {"tests", "docs", "examples", "demo"}
SUPPORTED_CODE_EXTENSIONS = {".py", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"}


def is_excluded_path(path):
    parts = path.lower().split("/")
    return any(part in EXCLUDED_DIRS for part in parts[:-1])


@app.route("/repo-tree", methods=["GET"])
def repo_tree():
    owner = request.args.get("owner", "").strip()
    repo = request.args.get("repo", "").strip()

    if not owner or not repo:
        return jsonify({"error": "owner and repo query params are required"}), 400

    files = get_repo_files(owner, repo)
    if files is None:
        return jsonify({"error": get_last_github_error() or "Failed to fetch repository tree"}), 502

    return jsonify(build_tree(files))


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    repo_url = data.get("repo_url")

    if not repo_url:
        return jsonify({"error": "No repository URL provided"}), 400

    parts = repo_url.rstrip("/").split("/")
    owner = parts[-2]
    repo = parts[-1]

    files = get_repo_files(owner, repo)

    if not files:
        return jsonify({"error": get_last_github_error() or "Failed to fetch repository"}), 502

    results = []
    code_files = [
        file for file in files
        if file.get("type") == "blob"
        and any(file.get("path", "").lower().endswith(ext) for ext in SUPPORTED_CODE_EXTENSIONS)
        and not is_excluded_path(file.get("path", ""))
    ]
    total_files = len(code_files)

    for file in code_files:
        file_path = file["path"]
        print("Scanning:", file_path)

        content = get_file_content(owner, repo, file_path)
        if content:
            issues = analyze_code(content, file_path)

            if issues:
                for issue in issues:
                    issue["file"] = file_path
                results.extend(issues)

    structural_risk_score, severity_breakdown, category_breakdown = calculate_risk_score(results, total_files)
    risk_level = classify_risk(structural_risk_score)

    repository_insights = build_repository_summary(owner, repo, files, get_file_content)
    frontend_preview = build_frontend_preview_metadata(owner, repo, files, get_file_content)

    # Compute top risky files
    top_risky_files = []
    if results:
        file_counts = Counter([issue["file"] for issue in results if "file" in issue])
        top_risky_files = [
            {"file": f, "issue_count": c}
            for f, c in file_counts.most_common(5)
        ]

    return jsonify({
        "structural_risk_score": structural_risk_score,
        "risk_level": risk_level,
        "total_issues": len(results),
        "total_files": total_files,
        "severity_breakdown": severity_breakdown,
        "category_breakdown": category_breakdown,
        "top_risky_files": top_risky_files,
        "repository_insights": repository_insights,
        "frontend_preview": frontend_preview,
        "issues": results
    })


@app.route("/file-content", methods=["GET"])
def get_file_content_api():
    owner = request.args.get("owner", "").strip()
    repo = request.args.get("repo", "").strip()
    path = request.args.get("path", "").strip()
    
    if not owner or not repo or not path:
        return jsonify({"error": "owner, repo, and path query params are required"}), 400
        
    content = get_file_content(owner, repo, path)
    if content is None:
        return jsonify({"error": "Failed to fetch file content"}), 404
        
    return jsonify({"content": content})


@app.route("/ai/fix", methods=["POST"])
def ai_fix():
    data = request.json
    code = data.get("code")
    issue = data.get("issue")
    language = data.get("language")
    file_path = data.get("file_path")
    
    if not all([code, issue, language, file_path]):
        return jsonify({"error": "Missing required fields: code, issue, language, file_path"}), 400
        
    result = generate_ai_fix(code, issue, language, file_path)
    return jsonify(result)

@app.route("/apply-fix", methods=["POST"])
def apply_fix():
    data = request.json
    repo_url = data.get("repo")
    file_path = data.get("file_path")
    updated_code = data.get("updated_code")
    
    if not all([repo_url, file_path, updated_code]):
        return jsonify({"error": "Missing required fields: repo, file_path, updated_code"}), 400
        
    parts = repo_url.rstrip("/").split("/")
    owner = parts[-2]
    repo = parts[-1]
    
    msg = "AI Fix: Improved code quality and resolved issue"
    result, status_code = update_file_content(owner, repo, file_path, updated_code, msg)
    
    if status_code in (200, 201):
        return jsonify({"success": True, "data": result})
    else:
        return jsonify({"error": "Failed to apply fix", "details": result}), status_code

@app.route("/push-fix", methods=["POST"])
def push_fix():
    data = request.json
    repo_url = data.get("repo")
    file_path = data.get("file_path")
    updated_code = data.get("updated_code")

    if not all([repo_url, file_path, updated_code]):
        return jsonify({"error": "Missing required fields: repo, file_path, updated_code"}), 400

    parts = repo_url.rstrip("/").split("/")
    owner = parts[-2]
    repo = parts[-1]

    msg = "AI Fix: Updated using GitRepoVision"
    result, status_code = push_fix_to_branch(owner, repo, file_path, updated_code, msg)

    if status_code in (200, 201):
        # Result from github api for file creation/update contains 'commit.html_url' and 'content.html_url'
        commit_url = result.get("commit", {}).get("html_url")
        content_url = result.get("content", {}).get("html_url")
        return jsonify({
            "success": True, 
            "branch": "gitrepovision-fix",
            "commit_url": commit_url,
            "data": result
        })
    else:
        return jsonify({"error": "Failed to push fix", "details": result}), status_code

if __name__ == "__main__":
    app.run(debug=True)