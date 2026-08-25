import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from app.main import app
from app.core.security import create_access_token
from app.services.ws_manager import manager

def test_websocket_auth_failure(client: TestClient):
    with pytest.raises(WebSocketDisconnect) as excinfo:
        with client.websocket_connect("/api/v1/ws/notifications") as websocket:
            # We must send invalid token JSON so the server doesn't hang waiting
            websocket.send_json({"token": "invalid"})
            websocket.receive_text() # Will raise WebSocketDisconnect
    assert excinfo.value.code == 4401

def test_websocket_message_throttle(client: TestClient, active_user, db_session):
    token = create_access_token(str(active_user.id))
    with pytest.raises(WebSocketDisconnect) as excinfo:
        with client.websocket_connect(f"/api/v1/ws/notifications?token={token}") as websocket:
            # Throttle allows 30 per min, so 31 should kill it
            for _ in range(35):
                websocket.send_text("ping")
            websocket.receive_text() # catch the disconnect
    assert excinfo.value.code == 1008

def test_websocket_connection_cap(client: TestClient, active_user, db_session):
    import asyncio
    from app.services.ws_manager import ConnectionManager
    from unittest.mock import AsyncMock
    
    cm = ConnectionManager()
    user_id = active_user.id
    
    async def run_cap_test():
        socks = [AsyncMock() for _ in range(6)]
        for s in socks:
            await cm.connect(user_id, s)
            
        socks[0].close.assert_called_with(code=1008, reason="Connection limit exceeded")
        assert len(cm._connections[str(user_id)]) == 5
        
    asyncio.run(run_cap_test())
