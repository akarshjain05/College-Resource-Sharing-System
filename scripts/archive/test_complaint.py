import requests

# Login to get admin token
resp = requests.post("http://localhost:8000/api/v1/auth/login", data={"username": "akarshjain9575@gmail.com", "password": "securepassword123"})
if resp.status_code != 200:
    print("Login failed", resp.status_code, resp.text)
    exit(1)
token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Get complaints
resp = requests.get("http://localhost:8000/api/v1/complaints", headers=headers)
complaints = resp.json()
if not complaints:
    print("No complaints found")
    exit(1)

c = complaints[0]
print("Updating complaint", c["id"])

# Update complaint
payload = {
    "status": "resolved",
    "admin_response": "Replacement item provided to borrower.",
    "resolution_action": "replacement_provided",
    "resolution_notes": "Replacement item provided to borrower."
}
resp = requests.put(f"http://localhost:8000/api/v1/complaints/{c['id']}", json=payload, headers=headers)
print("STATUS:", resp.status_code)
print("BODY:", resp.text)
