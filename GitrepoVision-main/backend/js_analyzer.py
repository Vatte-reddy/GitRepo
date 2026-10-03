import re
import subprocess
import json
import os
import sys


JS_TS_EXTENSIONS = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"}

LONG_FUNCTION_THRESHOLD = 20
TOO_MANY_PARAMS_THRESHOLD = 5
DEEP_NESTING_THRESHOLD = 3
COMPLEXITY_THRESHOLD = 10

SUSPICIOUS_TOKENS = {
    "password", "passwd", "secret", "token",
    "apikey", "auth", "credential", "credentials"
}
SUSPICIOUS_COMPOUND_NAMES = {"api_key", "access_key"}

RESERVED_WORDS = {
    "if", "for", "while", "switch", "catch", "function",
    "constructor", "return", "else", "try", "do"
}


def _extract_tokens(var_name):
    camel_split = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", var_name)
    normalized = camel_split.strip("_").lower()
    return [token for token in re.split(r"[^a-z0-9]+", normalized) if token]


def _is_suspicious_name(var_name):
    normalized = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", var_name).strip("_").lower()

    if normalized in SUSPICIOUS_COMPOUND_NAMES:
        return True

    tokens = _extract_tokens(var_name)
    if not tokens:
        return False

    return any(token in SUSPICIOUS_TOKENS for token in tokens)


def _is_high_entropy(value):
    if len(value) < 20:
        return False

    if any(ch.isspace() for ch in value):
        return False

    if value.isalpha():
        return False

    digit_count = sum(c.isdigit() for c in value)
    upper_count = sum(c.isupper() for c in value)
    lower_count = sum(c.islower() for c in value)
    special_count = sum(not c.isalnum() for c in value)

    return (
        digit_count >= 2 and
        upper_count >= 1 and
        lower_count >= 1 and
        special_count >= 1
    )


def _parse_param_count(params):
    cleaned = params.strip()
    if not cleaned:
        return 0
    return len([p for p in cleaned.split(",") if p.strip()])


def _extract_js_functions(lines):
    functions = []
    total_lines = len(lines)

    declaration_pattern = re.compile(
        r"^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)"
    )
    assigned_arrow_pattern = re.compile(
        r"^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>"
    )
    assigned_arrow_single_param_pattern = re.compile(
        r"^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?([A-Za-z_$][\w$]*)\s*=>"
    )
    method_pattern = re.compile(
        r"^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{"
    )

    i = 0
    while i < total_lines:
        line = lines[i]
        stripped = line.strip()

        if not stripped or stripped.startswith("//"):
            i += 1
            continue

        function_name = None
        params = ""
        matched_kind = None

        match = declaration_pattern.match(line)
        if match:
            function_name = match.group(1)
            params = match.group(2)
            matched_kind = "block"

        if not function_name:
            match = assigned_arrow_pattern.match(line)
            if match:
                function_name = match.group(1)
                params = match.group(2)
                matched_kind = "arrow"

        if not function_name:
            match = assigned_arrow_single_param_pattern.match(line)
            if match:
                function_name = match.group(1)
                params = match.group(2)
                matched_kind = "arrow"

        if not function_name:
            match = method_pattern.match(line)
            if match and match.group(1) not in RESERVED_WORDS:
                function_name = match.group(1)
                params = match.group(2)
                matched_kind = "block"

        if not function_name:
            i += 1
            continue

        start_line = i + 1
        param_count = _parse_param_count(params)

        open_braces = line.count("{")
        close_braces = line.count("}")

        # Handle concise arrow functions without block bodies.
        if matched_kind == "arrow" and open_braces == 0:
            functions.append({
                "name": function_name,
                "params": param_count,
                "start": start_line,
                "end": start_line,
                "body": line,
                "max_depth": 0,
                "complexity": 1,
            })
            i += 1
            continue

        brace_balance = open_braces - close_braces
        saw_open_brace = open_braces > 0
        j = i
        max_depth = max(brace_balance, 0)

        while j + 1 < total_lines:
            j += 1
            next_line = lines[j]

            opens = next_line.count("{")
            closes = next_line.count("}")

            if opens > 0:
                saw_open_brace = True

            brace_balance += opens - closes
            if brace_balance > max_depth:
                max_depth = brace_balance

            if saw_open_brace and brace_balance <= 0:
                break

        end_line = j + 1
        function_source = "\n".join(lines[i:j + 1])

        complexity = 1
        complexity += len(re.findall(r"\bif\b", function_source))
        complexity += len(re.findall(r"\bfor\b", function_source))
        complexity += len(re.findall(r"\bwhile\b", function_source))
        complexity += len(re.findall(r"\bcase\b", function_source))
        complexity += len(re.findall(r"\bcatch\b", function_source))
        complexity += function_source.count("&&")
        complexity += function_source.count("||")

        functions.append({
            "name": function_name,
            "params": param_count,
            "start": start_line,
            "end": end_line,
            "body": function_source,
            "max_depth": max(max_depth - 1, 0),
            "complexity": complexity,
        })

        i = j + 1

    return functions


def _find_hardcoded_credentials(lines):
    issues = []
    seen_issues = set()

    assignment_pattern = re.compile(
        r"\b(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*[:=]\s*(['\"`])([^'\"`]{4,})\2"
    )
    object_key_pattern = re.compile(
        r"['\"]([A-Za-z_$][\w$-]*)['\"]\s*:\s*(['\"`])([^'\"`]{4,})\2"
    )

    for idx, line in enumerate(lines, start=1):
        for match in assignment_pattern.finditer(line):
            variable = match.group(1)
            value = match.group(3)
            if _is_suspicious_name(variable):
                key = (idx, variable, "name")
                if key not in seen_issues:
                    seen_issues.add(key)
                    issues.append({
                        "rule": "Hardcoded Credential",
                        "variable": variable,
                        "line": idx,
                        "severity": "High",
                    })
            elif _is_high_entropy(value):
                key = (idx, "high-entropy")
                if key not in seen_issues:
                    seen_issues.add(key)
                    issues.append({
                        "rule": "Hardcoded Credential",
                        "line": idx,
                        "severity": "High",
                        "message": "Possible hardcoded secret (high entropy string)",
                    })

        for match in object_key_pattern.finditer(line):
            variable = match.group(1)
            value = match.group(3)
            if _is_suspicious_name(variable) or _is_high_entropy(value):
                key = (idx, variable, "object")
                if key not in seen_issues:
                    seen_issues.add(key)
                    issues.append({
                        "rule": "Hardcoded Credential",
                        "variable": variable,
                        "line": idx,
                        "severity": "High",
                    })

    return issues


def _find_dangerous_usage(lines):
    issues = []

    patterns = [
        (re.compile(r"\beval\s*\("), "eval"),
        (re.compile(r"\bFunction\s*\("), "Function"),
        (re.compile(r"\bsetTimeout\s*\(\s*['\"`]"), "setTimeout"),
        (re.compile(r"\bsetInterval\s*\(\s*['\"`]"), "setInterval"),
        (re.compile(r"\bdocument\.write\s*\("), "document.write"),
    ]

    for idx, line in enumerate(lines, start=1):
        for pattern, fn_name in patterns:
            if pattern.search(line):
                issues.append({
                    "rule": "Dangerous Function Usage",
                    "function": fn_name,
                    "line": idx,
                    "severity": "High",
                })

    return issues


def analyze_javascript_code(source_code, file_path="unknown.js"):
    """
    Analyze JavaScript/TypeScript code using:
    1. Babel AST parser (if Node.js available)
    2. Fallback to heuristic regex-based analysis
    """
    # Try AST parser first
    ast_result = _try_analyze_with_ast(source_code, file_path)
    if ast_result is not None:
        return ast_result
    
    # Fallback to heuristic analysis
    return _analyze_javascript_heuristic(source_code)


def _try_analyze_with_ast(source_code, file_path):
    """
    Attempt to analyze code using Babel AST parser via Node.js subprocess.
    Returns None if parser not available, otherwise returns issues list.
    """
    try:
        # Check if Node.js is available
        subprocess.run(
            ["node", "--version"],
            capture_output=True,
            timeout=2,
            check=False,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        # Node.js not available, use fallback
        return None
    
    try:
        parser_script = os.path.join(os.path.dirname(__file__), "js_parser.js")
        
        # Call Node.js parser script
        result = subprocess.run(
            ["node", parser_script, file_path],
            input=source_code,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        
        if result.returncode != 0:
            # Parser had error, use fallback
            return None
        
        # Parse JSON output from parser
        try:
            ast_data = json.loads(result.stdout)
        except json.JSONDecodeError:
            return None
        
        if not ast_data.get("success", False):
            # Parser failed, use fallback
            return None
        
        # Convert AST parser results to issue format
        return _convert_ast_to_issues(ast_data, source_code)
        
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        # Any error, fallback to heuristic
        return None


def _convert_ast_to_issues(ast_data, source_code):
    """
    Convert Babel AST parser results to issue format compatible with scoring engine.
    """
    issues = []
    lines = source_code.splitlines()
    
    # Process functions
    for fn in ast_data.get("functions", []):
        name = fn.get("name", "anonymous")
        params = fn.get("params", 0)
        start_line = fn.get("start", 0)
        body_lines = fn.get("body_lines", 0)
        complexity = fn.get("complexity", 1)
        max_depth = fn.get("max_depth", 0)
        
        # Long Function rule
        if body_lines > LONG_FUNCTION_THRESHOLD:
            issues.append({
                "rule": "Long Function",
                "function": name,
                "line": start_line,
                "severity": "Medium",
            })
        
        # Too Many Parameters rule
        if params > TOO_MANY_PARAMS_THRESHOLD:
            issues.append({
                "rule": "Too Many Parameters",
                "function": name,
                "line": start_line,
                "severity": "Medium",
            })
        
        # Deep Nesting rule
        if max_depth > DEEP_NESTING_THRESHOLD:
            issues.append({
                "rule": "Deep Nesting",
                "function": name,
                "line": start_line,
                "severity": "High",
            })
        
        # High Cyclomatic Complexity rule
        if complexity > COMPLEXITY_THRESHOLD:
            issues.append({
                "rule": "High Cyclomatic Complexity",
                "function": name,
                "complexity": complexity,
                "line": start_line,
                "severity": "High",
            })
    
    # Process hardcoded credentials
    for cred in ast_data.get("credentials", []):
        issues.append({
            "rule": "Hardcoded Credential",
            "line": cred.get("line", 0),
            "severity": cred.get("severity", "High"),
            "variable": cred.get("variable", "unknown"),
        })
    
    # Process dangerous function usage
    for danger in ast_data.get("dangerous_usage", []):
        issues.append({
            "rule": "Dangerous Function Usage",
            "function": danger.get("function", "unknown"),
            "line": danger.get("line", 0),
            "severity": danger.get("severity", "High"),
        })
    
    return issues


def _analyze_javascript_heuristic(source_code):
    """
    Fallback heuristic analysis using regex patterns.
    Used when Babel AST parser is not available.
    """
    lines = source_code.splitlines()
    issues = []

    functions = _extract_js_functions(lines)

    for fn in functions:
        length = fn["end"] - fn["start"] + 1
        if length > LONG_FUNCTION_THRESHOLD:
            issues.append({
                "rule": "Long Function",
                "function": fn["name"],
                "line": fn["start"],
                "severity": "Medium",
            })

        if fn["params"] > TOO_MANY_PARAMS_THRESHOLD:
            issues.append({
                "rule": "Too Many Parameters",
                "function": fn["name"],
                "line": fn["start"],
                "severity": "Medium",
            })

        if fn["max_depth"] > DEEP_NESTING_THRESHOLD:
            issues.append({
                "rule": "Deep Nesting",
                "function": fn["name"],
                "line": fn["start"],
                "severity": "High",
            })

        if fn["complexity"] > COMPLEXITY_THRESHOLD:
            issues.append({
                "rule": "High Cyclomatic Complexity",
                "function": fn["name"],
                "complexity": fn["complexity"],
                "line": fn["start"],
                "severity": "High",
            })

    issues.extend(_find_hardcoded_credentials(lines))
    issues.extend(_find_dangerous_usage(lines))

    return issues