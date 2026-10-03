/**
 * Babel-based JavaScript/TypeScript AST Parser
 * 
 * This script uses @babel/parser to parse JavaScript/TypeScript code
 * and extract code metrics for analysis.
 * 
 * Usage: node js_parser.js <file_path>
 * Input: JavaScript/TypeScript code via stdin
 * Output: JSON with extracted functions, credentials, dangerous usage
 */

const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

// Read input from stdin
let input = "";
process.stdin.setEncoding("utf8");

process.stdin.on("readable", () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    input += chunk;
  }
});

process.stdin.on("end", () => {
  try {
    const filePath = process.argv[2] || "unknown.js";
    const result = analyzeCode(input, filePath);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    // Return error in a parseable format
    console.log(
      JSON.stringify({ error: error.message, success: false }, null, 2)
    );
    process.exit(1);
  }
});

/**
 * Analyze JavaScript/TypeScript code using Babel AST
 */
function analyzeCode(sourceCode, filePath) {
  const isTypeScript = /\.(ts|tsx)$/i.test(filePath);

  let ast;
  try {
    ast = parser.parse(sourceCode, {
      sourceType: "module",
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: isTypeScript
        ? ["typescript", "jsx", "logicalAssignment", "decorators"]
        : ["jsx", "flow", "logicalAssignment", "decorators"],
    });
  } catch (parseError) {
    // Fallback for files with parse errors
    return {
      success: false,
      error: parseError.message,
      functions: [],
      credentials: [],
      dangerous_usage: [],
    };
  }

  const functions = extractFunctions(sourceCode, ast);
  const credentials = findHardcodedCredentials(sourceCode, ast);
  const dangerousUsage = findDangerousUsage(sourceCode, ast);

  return {
    success: true,
    functions,
    credentials,
    dangerous_usage: dangerousUsage,
  };
}

/**
 * Extract function definitions with metrics
 */
function extractFunctions(sourceCode, ast) {
  const functions = [];
  const lines = sourceCode.split("\n");

  traverse(ast, {
    FunctionDeclaration(path) {
      const node = path.node;
      const metrics = calculateFunctionMetrics(node, sourceCode, lines);
      functions.push({
        name: node.id?.name || "anonymous",
        params: node.params.length,
        start: node.loc?.start.line || 0,
        end: node.loc?.end.line || 0,
        complexity: metrics.complexity,
        max_depth: metrics.max_depth,
        body_lines: metrics.body_lines,
      });
    },

    ArrowFunctionExpression(path) {
      const node = path.node;
      // Only top-level declarations (const x = () => {})
      if (
        path.parent.type === "VariableDeclarator" ||
        path.parent.type === "AssignmentExpression"
      ) {
        const name = extractVariableName(path.parent);
        if (name) {
          const metrics = calculateFunctionMetrics(node, sourceCode, lines);
          functions.push({
            name,
            params: node.params.length,
            start: node.loc?.start.line || 0,
            end: node.loc?.end.line || 0,
            complexity: metrics.complexity,
            max_depth: metrics.max_depth,
            body_lines: metrics.body_lines,
          });
        }
      }
    },

    ClassMethod(path) {
      const node = path.node;
      const metrics = calculateFunctionMetrics(node, sourceCode, lines);
      functions.push({
        name: node.key?.name || "method",
        params: node.params.length,
        start: node.loc?.start.line || 0,
        end: node.loc?.end.line || 0,
        complexity: metrics.complexity,
        max_depth: metrics.max_depth,
        body_lines: metrics.body_lines,
      });
    },

    ObjectMethod(path) {
      const node = path.node;
      const metrics = calculateFunctionMetrics(node, sourceCode, lines);
      functions.push({
        name: node.key?.name || "method",
        params: node.params.length,
        start: node.loc?.start.line || 0,
        end: node.loc?.end.line || 0,
        complexity: metrics.complexity,
        max_depth: metrics.max_depth,
        body_lines: metrics.body_lines,
      });
    },
  });

  return functions;
}

/**
 * Calculate function complexity and nesting depth
 */
function calculateFunctionMetrics(node, sourceCode, lines) {
  let complexity = 1;
  let max_depth = 0;
  const body_lines = node.loc?.end.line - node.loc?.start.line + 1 || 0;

  if (!node.body) {
    return { complexity, max_depth, body_lines };
  }

  const bodySource = sourceCode.substring(node.body.start, node.body.end);

  // Count control flow statements
  complexity += (bodySource.match(/\bif\b/g) || []).length;
  complexity += (bodySource.match(/\belse\b/g) || []).length;
  complexity += (bodySource.match(/\bfor\b/g) || []).length;
  complexity += (bodySource.match(/\bwhile\b/g) || []).length;
  complexity += (bodySource.match(/\bdo\b/g) || []).length;
  complexity += (bodySource.match(/\bcase\b/g) || []).length;
  complexity += (bodySource.match(/\bcatch\b/g) || []).length;
  complexity += (bodySource.match(/&&/g) || []).length;
  complexity += (bodySource.match(/\|\|/g) || []).length;
  complexity += (bodySource.match(/\?/g) || []).length;

  // Calculate max nesting depth
  let depth = 0;
  for (let char of bodySource) {
    if (char === "{") {
      depth++;
      max_depth = Math.max(max_depth, depth);
    } else if (char === "}") {
      depth--;
    }
  }

  return { complexity, max_depth: Math.max(max_depth - 1, 0), body_lines };
}

/**
 * Find hardcoded credentials
 */
function findHardcodedCredentials(sourceCode, ast) {
  const credentials = [];
  const suspiciousTokens = {
    password: true,
    passwd: true,
    secret: true,
    token: true,
    apikey: true,
    api_key: true,
    access_key: true,
    auth: true,
    credential: true,
    credentials: true,
  };

  traverse(ast, {
    StringLiteral(path) {
      const node = path.node;
      const parent = path.parent;

      // Check variable names
      if (parent.type === "VariableDeclarator") {
        const varName = parent.id?.name || "";
        if (
          isSuspiciousName(varName, suspiciousTokens) &&
          isHighEntropy(node.value)
        ) {
          credentials.push({
            type: "suspicious_name",
            variable: varName,
            line: node.loc?.start.line || 0,
            severity: "High",
          });
        }
      }

      // Check object keys
      if (parent.type === "ObjectProperty") {
        const keyName = parent.key?.name || parent.key?.value || "";
        if (
          isSuspiciousName(keyName, suspiciousTokens) &&
          isHighEntropy(node.value)
        ) {
          credentials.push({
            type: "object_property",
            variable: keyName,
            line: node.loc?.start.line || 0,
            severity: "High",
          });
        }
      }
    },

    TemplateLiteral(path) {
      const node = path.node;
      const parent = path.parent;

      if (parent.type === "VariableDeclarator") {
        const varName = parent.id?.name || "";
        const templateStr = node.quasis
          .map((q) => q.value.cooked || q.value.raw)
          .join("");

        if (
          isSuspiciousName(varName, suspiciousTokens) &&
          isHighEntropy(templateStr)
        ) {
          credentials.push({
            type: "suspicious_template",
            variable: varName,
            line: node.loc?.start.line || 0,
            severity: "High",
          });
        }
      }
    },
  });

  return credentials;
}

/**
 * Find dangerous function calls (eval, etc.)
 */
function findDangerousUsage(sourceCode, ast) {
  const dangerous = [];
  const dangerousFunctions = {
    eval: true,
    Function: true,
    setTimeout: true,
    setInterval: true,
  };

  traverse(ast, {
    CallExpression(path) {
      const node = path.node;
      const callee = node.callee;
      let functionName = "";

      if (callee.type === "Identifier") {
        functionName = callee.name;
      } else if (callee.type === "MemberExpression") {
        functionName = callee.property?.name || "";
      }

      if (dangerousFunctions[functionName]) {
        dangerous.push({
          function: functionName,
          line: node.loc?.start.line || 0,
          severity: "High",
        });
      }
    },
  });

  return dangerous;
}

/**
 * Check if variable name is suspicious
 */
function isSuspiciousName(varName, suspiciousTokens) {
  if (!varName) return false;

  const normalized = varName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();

  const tokens = normalized.split(/[^a-z0-9]+/).filter((t) => t);
  return tokens.some((t) => suspiciousTokens[t]);
}

/**
 * Check if string has high entropy (likely to be a secret)
 */
function isHighEntropy(value) {
  if (typeof value !== "string" || value.length < 20) return false;
  if (/\s/.test(value)) return false;
  if (/^[a-z]*$/i.test(value)) return false;

  const digitCount = (value.match(/\d/g) || []).length;
  const upperCount = (value.match(/[A-Z]/g) || []).length;
  const lowerCount = (value.match(/[a-z]/g) || []).length;
  const specialCount = (value.match(/[^a-zA-Z0-9]/g) || []).length;

  return (
    digitCount >= 2 && upperCount >= 1 && lowerCount >= 1 && specialCount >= 1
  );
}

/**
 * Extract variable name from assignment/declaration
 */
function extractVariableName(parent) {
  if (parent.type === "VariableDeclarator") {
    return parent.id?.name;
  }
  if (parent.type === "AssignmentExpression") {
    return parent.left?.name;
  }
  return null;
}
