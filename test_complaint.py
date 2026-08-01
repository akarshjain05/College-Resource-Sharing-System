import requests

resp = requests.post("http://13.48.123.128.sslip.io/api/auth/login", data={"username": "akarshjain953@gmail.com", "password": "password"})
token = resp.json().get("access_token")

headers = {"Authorization": f"Bearer {token}"}
resp = requests.get("http://13.48.123.128.sslip.io/api/complaints", headers=headers)
complaints = resp.json()

if complaints:
    c = complaints[0]
    payload = {
        "status": "in_progress",
        "admin_response": "Testing response from bot",
        "trust_score_penalty": 0
    }
    resp = requests.put(f"http://13.48.123.128.sslip.io/api/complaints/{c['id']}", json=payload, headers=headers)
    print("PUT status:", resp.status_code)
    
    resp = requests.get("http://13.48.123.128.sslip.io/api/complaints", headers=headers)
    c2 = resp.json()[0]
    print("New admin_response:", c2.get("admin_response"))
