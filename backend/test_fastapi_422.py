from fastapi import FastAPI
from fastapi.testclient import TestClient
import uuid

app = FastAPI()

@app.post("/test/{req_id}/cancel")
def test_endpoint(req_id: uuid.UUID):
    return {"status": "ok"}

client = TestClient(app)
resp = client.post(f"/test/{uuid.uuid4()}/cancel")
print("Response:", resp.status_code, resp.text)
