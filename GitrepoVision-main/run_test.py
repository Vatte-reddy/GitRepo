import requests
import json

url = "http://127.0.0.1:5000/analyze"
payload = {"repo_url": "https://github.com/kennethreitz/requests"}
headers = {"Content-Type": "application/json"}

print("Sending request to analyze repository with 120s timeout...")
try:
    response = requests.post(url, json=payload, headers=headers, timeout=120)
    print(f"Status Code: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except Exception:
        print(response.text)
except Exception as e:
    print("Request failed:", type(e).__name__, e)
