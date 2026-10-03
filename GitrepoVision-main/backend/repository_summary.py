import json
from pathlib import PurePosixPath


EXTENSION_LANGUAGE_MAP = {
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".py": "Python",
    ".java": "Java",
    ".go": "Go",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".cpp": "C++",
    ".c": "C",
    ".rs": "Rust",
    ".kt": "Kotlin",
    ".swift": "Swift",
}


TECH_DOCS_MAP = {
    "React": "https://react.dev",
    "Angular": "https://angular.dev",
    "Vue": "https://vuejs.org",
    "Next.js": "https://nextjs.org/docs",
    "Node.js": "https://nodejs.org",
    "Express": "https://expressjs.com",
    "Flask": "https://flask.palletsprojects.com",
    "Django": "https://docs.djangoproject.com",
    "FastAPI": "https://fastapi.tiangolo.com",
    "Spring Boot": "https://spring.io/projects/spring-boot",
    "JavaScript": "https://developer.mozilla.org/docs/Web/JavaScript",
    "TypeScript": "https://www.typescriptlang.org/docs",
    "Python": "https://docs.python.org/3",
    "Java": "https://docs.oracle.com/en/java/",
}


def _safe_json_loads(content):
    try:
        return json.loads(content)
    except Exception:
        return {}


def _get_repo_file(files, filename):
    """Return first blob path whose basename matches filename (case-insensitive)."""
    filename_lower = filename.lower()
    for file in files:
        path = file.get("path", "")
        if file.get("type") != "blob":
            continue
        if PurePosixPath(path).name.lower() == filename_lower:
            return path
    return None


def _extract_dependencies_from_package_json(package_json_content):
    data = _safe_json_loads(package_json_content)
    dependencies = data.get("dependencies", {}) or {}
    dev_dependencies = data.get("devDependencies", {}) or {}
    return {**dependencies, **dev_dependencies}


def _extract_requirements(requirements_content):
    packages = set()
    for line in requirements_content.splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        normalized = raw.split("==")[0].split(">=")[0].split("<=")[0].strip().lower()
        if normalized:
            packages.add(normalized)
    return packages


def _readme_contains_any(readme_content, keywords):
    text = (readme_content or "").lower()
    return any(keyword in text for keyword in keywords)


def _has_frontend_file_signals(files):
    frontend_exts = {".jsx", ".tsx", ".vue", ".svelte", ".html", ".css", ".scss"}
    frontend_dirs = {"src", "public", "frontend", "client", "web", "ui", "components", "pages"}

    for file in files:
        if file.get("type") != "blob":
            continue
        path = file.get("path", "")
        path_lower = path.lower()
        parts = [p for p in path_lower.split("/") if p]
        suffix = PurePosixPath(path_lower).suffix

        if suffix in frontend_exts:
            return True
        if suffix in {".js", ".ts"} and any(part in frontend_dirs for part in parts[:-1]):
            return True

    return False


def _detect_technologies(package_deps, requirements_pkgs, files, readme_content=""):
    frontend = set()
    backend = set()

    dep_keys = {k.lower() for k in package_deps.keys()}

    # Frontend detection from package dependencies
    if any(key in dep_keys for key in {"react", "react-dom", "react-scripts", "@vitejs/plugin-react"}):
        frontend.add("React")
    if "@angular/core" in dep_keys:
        frontend.add("Angular")
    if "vue" in dep_keys:
        frontend.add("Vue")
    if "next" in dep_keys:
        frontend.add("Next.js")

    # Frontend detection from README and file structure (fallback signals)
    if _readme_contains_any(readme_content, ["react", "reactjs"]):
        frontend.add("React")
    if _readme_contains_any(readme_content, ["angular"]):
        frontend.add("Angular")
    if _readme_contains_any(readme_content, ["vue.js", "vuejs", "vue "]):
        frontend.add("Vue")
    if _readme_contains_any(readme_content, ["next.js", "nextjs"]):
        frontend.add("Next.js")

    if not frontend and _has_frontend_file_signals(files):
        # Common fallback for JS/TS frontend repositories.
        frontend.add("React")

    # Backend detection from package dependencies
    if dep_keys:
        backend.add("Node.js")
    if "express" in dep_keys:
        backend.add("Express")

    req = {pkg.lower() for pkg in requirements_pkgs}
    if "flask" in req:
        backend.add("Flask")
    if "django" in req:
        backend.add("Django")
    if "fastapi" in req:
        backend.add("FastAPI")

    # Java backend indicator
    has_java = any((file.get("path", "").lower().endswith(".java") and file.get("type") == "blob") for file in files)
    if has_java:
        backend.add("Spring Boot")

    return sorted(frontend), sorted(backend)


def _detect_languages(files):
    languages = set()
    for file in files:
        if file.get("type") != "blob":
            continue
        path = file.get("path", "")
        suffix = PurePosixPath(path).suffix.lower()
        language = EXTENSION_LANGUAGE_MAP.get(suffix)
        if language:
            languages.add(language)
    return sorted(languages)


def _build_setup_instructions(frontend, backend, languages):
    commands = []

    if any(tech in {"React", "Angular", "Vue", "Next.js", "Node.js", "Express"} for tech in frontend + backend):
        commands.extend([
            "npm install",
            "npm start",
        ])

    if "Python" in languages or any(tech in {"Flask", "Django", "FastAPI"} for tech in backend):
        commands.extend([
            "pip install -r requirements.txt",
            "python app.py",
        ])

    # Stable de-dup preserving order
    deduped = []
    seen = set()
    for cmd in commands:
        if cmd not in seen:
            seen.add(cmd)
            deduped.append(cmd)

    return deduped


def _build_docs(frontend, backend, languages):
    docs = []
    seen = set()
    for tech in frontend + backend + languages:
        url = TECH_DOCS_MAP.get(tech)
        if url and tech not in seen:
            seen.add(tech)
            docs.append({"name": tech, "url": url})
    return docs


def build_repository_summary(owner, repo, files, get_file_content_fn):
    package_json_path = _get_repo_file(files, "package.json")
    requirements_path = _get_repo_file(files, "requirements.txt")
    readme_path = _get_repo_file(files, "README.md")

    package_deps = {}
    requirements_pkgs = set()
    readme_content = ""

    if package_json_path:
        package_json_content = get_file_content_fn(owner, repo, package_json_path)
        if package_json_content:
            package_deps = _extract_dependencies_from_package_json(package_json_content)

    if requirements_path:
        requirements_content = get_file_content_fn(owner, repo, requirements_path)
        if requirements_content:
            requirements_pkgs = _extract_requirements(requirements_content)

    if readme_path:
        content = get_file_content_fn(owner, repo, readme_path)
        if content:
            readme_content = content

    frontend, backend = _detect_technologies(package_deps, requirements_pkgs, files, readme_content)
    languages = _detect_languages(files)

    return {
        "tech_stack": {
            "frontend": frontend,
            "backend": backend,
            "languages": languages,
        },
        "setup_instructions": _build_setup_instructions(frontend, backend, languages),
        "documentation_links": _build_docs(frontend, backend, languages),
        "detected_files": {
            "package_json": package_json_path,
            "requirements_txt": requirements_path,
            "readme_md": readme_path,
        },
    }
