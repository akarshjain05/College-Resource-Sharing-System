import urllib.request
import json

try:
    req = urllib.request.Request("https://13-48-123-128.sslip.io/api/v1/resources")
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print("Resources length:", len(data))
except Exception as e:
    print(e)
