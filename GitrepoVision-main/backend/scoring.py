import math


RULE_CATEGORY_MAP = {
    "Long Function": "Maintainability",
    "Too Many Parameters": "Maintainability",
    "Deep Nesting": "Maintainability",
    "High Cyclomatic Complexity": "Maintainability",
    "Hardcoded Credential": "Security",
    "Dangerous Function Usage": "Security",
    "Bare Except Block": "Security",
    "Unused Variable": "Code Smell"
}


def calculate_risk_score(issues, total_files):
    severity_weights = {
        "Low": 1,
        "Medium": 3,
        "High": 5
    }

    severity_count = {"Low": 0, "Medium": 0, "High": 0}
    raw_score = 0

    for issue in issues:
        severity = issue.get("severity", "Low")
        weight = severity_weights.get(severity, 1)
        raw_score += weight
        if severity in severity_count:
            severity_count[severity] += 1
        else:
            severity_count["Low"] += 1

    if total_files == 0:
        return 0, severity_count, {}

    # Compute category breakdown
    category_breakdown = {
        "Maintainability": 0,
        "Security": 0,
        "Code Smell": 0
    }
    for issue in issues:
        rule_name = issue.get("rule", "Unknown")
        category = RULE_CATEGORY_MAP.get(rule_name, "Maintainability")
        if category in category_breakdown:
            category_breakdown[category] += 1

    total_issues = len(issues)

    # Larger denominator makes score growth more realistic for mature repos.
    max_reasonable_score = total_files * 20
    normalized_score = (raw_score / max_reasonable_score) * 100

    # Softer density adjustment to avoid rapid inflation on smaller codebases.
    issue_density = total_issues / total_files
    density_multiplier = 1 + min(issue_density * 0.08, 0.4)

    # Mild high-severity boost that does not dominate the final score.
    high_issues = severity_count["High"]
    severity_boost = 1 + min(math.log1p(high_issues) * 0.05, 0.2)

    final_score = normalized_score * density_multiplier * severity_boost
    final_score = min(round(final_score, 2), 100)

    return final_score, severity_count, category_breakdown


def classify_risk(score):
    if score < 20:
        return "Low Risk"
    elif score < 45:
        return "Moderate Risk"
    elif score < 70:
        return "High Risk"
    else:
        return "Critical Risk"