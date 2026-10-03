from rules import LongFunctionRule

def analyze_file(file_path):
    import ast

    with open(file_path, "r", encoding="utf-8") as f:
        source = f.read()

    try:
        tree = ast.parse(source)
    except:
        return []

    rule = LongFunctionRule()
    return rule.check(tree)
