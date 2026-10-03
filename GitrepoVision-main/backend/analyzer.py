from pathlib import PurePosixPath

from js_analyzer import JS_TS_EXTENSIONS, analyze_javascript_code
from rules import (
    LongFunctionRule,
    TooManyParametersRule,
    DeepNestingRule,
    UnusedVariableRule,
    CyclomaticComplexityRule,
    HardcodedCredentialRule,
    DangerousFunctionUsageRule,
    BareExceptRule,
)


def _analyze_python_code(source_code):
    import ast

    try:
        tree = ast.parse(source_code)
    except Exception:
        return []

    rules = [
        LongFunctionRule(),
        TooManyParametersRule(),
        DeepNestingRule(),
        UnusedVariableRule(),
        CyclomaticComplexityRule(),
        HardcodedCredentialRule(),
        DangerousFunctionUsageRule(),
        BareExceptRule(),
    ]

    results = []

    for rule in rules:
        rule_results = rule.check(tree)
        if rule_results:
            results.extend(rule_results)

    return results


def analyze_code(source_code, file_path=""):
    suffix = PurePosixPath(file_path).suffix.lower()

    if suffix in JS_TS_EXTENSIONS:
        return analyze_javascript_code(source_code)

    return _analyze_python_code(source_code)




