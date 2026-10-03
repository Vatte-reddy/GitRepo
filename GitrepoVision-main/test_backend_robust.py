import requests
import json

# Test with a simple inline repository analysis
payload = {
    "repo_url": "https://github.com/tensorflow/tensorflow"  # Large repo, may take time
}

try:
    response = requests.post(
        'http://127.0.0.1:5000/analyze',
        json=payload,
        timeout=600  # 10 minute timeout for large repos
    )
    
    if response.status_code == 200:
        data = response.json()
        print('✓ Backend responded successfully')
        print(f'  Risk Score: {data.get("structural_risk_score")}')
        print(f'  Risk Level: {data.get("risk_level")}')
        print(f'  Total Files: {data.get("total_files")}')
        print(f'  Total Issues: {data.get("total_issues")}')
        
        # Check if we got JS/TS analysis
        if data.get('issues'):
            js_issues = [i for i in data['issues'] if 'function' in i or 'variable' in i]
            if js_issues:
                print(f'✓ Found {len(js_issues)} code quality issues')
                print(f'  Sample: {js_issues[0]["rule"]} at line {js_issues[0]["line"]}')
    else:
        print(f'✗ Error: {response.status_code}')
        print(response.text[:500])
except requests.exceptions.ConnectError:
    print('✗ Cannot connect to backend. Is it running on http://127.0.0.1:5000?')
except requests.exceptions.Timeout:
    print('✗ Request timed out. Backend may be still processing large repository.')
except Exception as e:
    print(f'✗ Error: {e}')
