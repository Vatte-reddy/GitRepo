import requests
import json

# Test with axios/axios (popular JS library)
response = requests.post(
    'http://127.0.0.1:5000/analyze',
    json={'repo_url': 'https://github.com/axios/axios'},
    timeout=180
)

if response.status_code == 200:
    data = response.json()
    print('Status: SUCCESS')
    print(f'Risk Score: {data.get("structural_risk_score")}')
    print(f'Risk Level: {data.get("risk_level")}')
    print(f'Total Files: {data.get("total_files")}')
    print(f'Total Issues: {data.get("total_issues")}')
    if data.get('issues'):
        print(f'Sample issues:')
        for issue in data['issues'][:3]:
            print(f"  - {issue['rule']} at line {issue['line']}")
else:
    print(f'Error: {response.status_code}')
    print(response.text[:500])
