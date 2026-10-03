import ast
import re

class LongFunctionRule:
    name = "Long Function"
    severity = "Medium"
    threshold = 20

    def check(self, tree):
        issues = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                length = len(node.body)

                if length > self.threshold:
                    issues.append({
                        "rule": self.name,
                        "function": node.name,
                        "line": node.lineno,
                        "severity": self.severity
                    })

        return issues

class TooManyParametersRule:
    name = "Too Many Parameters"
    severity = "Medium"
    threshold = 5

    def check(self, tree):
        issues = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if node.args:
                    param_count = len(node.args.args)
                    if param_count > self.threshold:
                        issues.append({
                            "rule": self.name,
                            "function": node.name,
                            "line": node.lineno,
                            "severity": self.severity
                        })

        return issues


class DeepNestingRule:
    name = "Deep Nesting"
    severity = "High"
    threshold = 3

    def check(self, tree):
        issues = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                max_depth = 0

                for child in ast.walk(node):
                    if isinstance(child, (ast.If, ast.For, ast.While)):
                        depth = self._get_depth(child)
                        max_depth = max(max_depth, depth)

                if max_depth > self.threshold:
                    issues.append({
                        "rule": self.name,
                        "function": node.name,
                        "line": node.lineno,
                        "severity": self.severity
                    })

        return issues

    def _get_depth(self, node):
        depth = 1
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.If, ast.For, ast.While)):
                depth = max(depth, 1 + self._get_depth(child))
        return depth


class UnusedVariableRule:
    name = "Unused Variable"
    severity = "Low"

    def check(self, tree):
        issues = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                assigned = set()
                used = set()

                for child in ast.walk(node):

                    # Track assignments
                    if isinstance(child, ast.Assign):
                        for target in child.targets:
                            if isinstance(target, ast.Name):
                                assigned.add(target.id)

                    # Track variable usage
                    if isinstance(child, ast.Name):
                        if isinstance(child.ctx, ast.Load):
                            used.add(child.id)

                unused_vars = assigned - used

                for var in unused_vars:
                    issues.append({
                        "rule": self.name,
                        "function": node.name,
                        "variable": var,
                        "line": node.lineno,
                        "severity": self.severity
                    })

        return issues


class CyclomaticComplexityRule:
    name = "High Cyclomatic Complexity"
    severity = "High"
    threshold = 10

    def check(self, tree):
        issues = []

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                complexity = 1  # base complexity

                for child in ast.walk(node):
                    if isinstance(child, (
                        ast.If,
                        ast.For,
                        ast.While,
                        ast.And,
                        ast.Or,
                        ast.ExceptHandler,
                        ast.With,
                        ast.Try
                    )):
                        complexity += 1

                if complexity > self.threshold:
                    issues.append({
                        "rule": self.name,
                        "function": node.name,
                        "complexity": complexity,
                        "line": node.lineno,
                        "severity": self.severity
                    })

        return issues


class HardcodedCredentialRule:
    name = "Hardcoded Credential"
    severity = "High"

    suspicious_tokens = {
        "password", "passwd", "secret", "token",
        "apikey", "auth", "credential", "credentials"
    }
    suspicious_compound_names = {"api_key", "access_key"}

    def _extract_tokens(self, var_name):
        camel_split = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", var_name)
        normalized = camel_split.strip("_").lower()
        return [token for token in re.split(r"[^a-z0-9]+", normalized) if token]

    def _is_suspicious_name(self, var_name):
        normalized = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", var_name).strip("_").lower()

        if normalized in self.suspicious_compound_names:
            return True

        tokens = self._extract_tokens(var_name)
        if not tokens:
            return False

        return any(token in self.suspicious_tokens for token in tokens)

    def is_high_entropy(self, value):
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

    def check(self, tree):
        issues = []
        seen_issues = set()

        for node in ast.walk(tree):

            if isinstance(node, ast.Assign):
                has_name_based_hit = False

                # Case 1: suspicious variable name
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        if self._is_suspicious_name(target.id):
                            if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                                key = (node.lineno, target.id, "name")
                                if key not in seen_issues:
                                    seen_issues.add(key)
                                    has_name_based_hit = True
                                    issues.append({
                                        "rule": self.name,
                                        "variable": target.id,
                                        "line": node.lineno,
                                        "severity": self.severity
                                    })

                # Case 2: high-entropy string even without keyword
                if not has_name_based_hit and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                    value = node.value.value

                    if self.is_high_entropy(value):
                        key = (node.lineno, "high-entropy")
                        if key not in seen_issues:
                            seen_issues.add(key)
                            issues.append({
                                "rule": self.name,
                                "line": node.lineno,
                                "severity": self.severity,
                                "message": "Possible hardcoded secret (high entropy string)"
                            })

        return issues


class DangerousFunctionUsageRule:
    name = "Dangerous Function Usage"
    severity = "High"

    dangerous_functions = ["eval", "exec"]

    def check(self, tree):
        issues = []

        for node in ast.walk(tree):

            if isinstance(node, ast.Call):

                if isinstance(node.func, ast.Name):
                    func_name = node.func.id

                    if func_name in self.dangerous_functions:
                        issues.append({
                            "rule": self.name,
                            "function": func_name,
                            "line": node.lineno,
                            "severity": self.severity
                        })

        return issues

class BareExceptRule:
    name = "Bare Except Block"
    severity = "Medium"

    def check(self, tree):
        issues = []

        for node in ast.walk(tree):

            if isinstance(node, ast.ExceptHandler):

                # If no exception type specified
                if node.type is None:
                    issues.append({
                        "rule": self.name,
                        "line": node.lineno,
                        "severity": self.severity
                    })

        return issues

