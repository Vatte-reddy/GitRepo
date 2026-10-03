import requests
import json

url = "http://127.0.0.1:5000/analyze"
# Using a smaller test repo
payload = {"repo_url": "https://github.com/kennethreitz/requests"}
headers = {"Content-Type": "application/json"}

print("Sending request to analyze repository...")
print(f"URL: {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")
print("-" * 50)

try:
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    print(f"\nStatus Code: {response.status_code}")
    print(f"\nResponse:\n{json.dumps(response.json(), indent=2)}")
except requests.exceptions.Timeout:
    print("Request timed out after 30 seconds")
except requests.exceptions.ConnectionError as e:
    print(f"Connection Error: {e}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
