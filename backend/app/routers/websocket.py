"""
WebSocket endpoint for real-time notification delivery.

Frontend connects with: ws://<host>/ws/notifications?token=<access_token>
Since browsers can't set custom headers on a WebSocket handshake, the JWT is
passed as a query parameter instead of the Authorization header used elsewhere.
"""
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models.user import User
from app.services.ws_manager import manager

router = APIRouter(tags=["WebSocket"])


def _authenticate_ws_token(token: str, db: Session) -> User | None:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        return None
    return db.query(User).filter(User.id == user_id).first()


@router.websocket("/ws/notifications")
async def notifications_websocket(websocket: WebSocket, token: str = Query(...)):
    db = SessionLocal()
    try:
        user = _authenticate_ws_token(token, db)
        if not user:
            await websocket.close(code=4401)
            return
    finally:
        db.close()

    await manager.connect(user.id, websocket)
    try:
        while True:
            # Client doesn't need to send anything; we just keep the socket alive
            # and use incoming pings/messages to detect disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)
