import sys
sys.path.insert(0, 'backend')
from js_analyzer import analyze_javascript_code

code = '''
function calculateTotal(price, tax, discount, shipping, insurance, handling) {
  if (price > 0) {
    for (let i = 0; i < 10; i++) {
      if (i > 5) {
        console.log(i);
      }
    }
  }
  return price + tax;
}

const apiSecret = 'stripe_key_placeholder';
eval('console.log(1)');
'''

issues = analyze_javascript_code(code, 'test.js')
print(f'Found {len(issues)} issues:')
for issue in issues:
    print(f"  - {issue['rule']} at line {issue['line']} (severity: {issue['severity']})")
