"""
WebSocket endpoint for real-time notification delivery.

Frontend connects with:
  wss://<host>/api/v1/ws/notifications?token=<access_token>   (preferred)
  ws://<host>/api/v1/ws/notifications                          (then sends JSON {token})

(main.py registers this router with prefix="/api/v1"). Since browsers can't set
custom headers on a WebSocket handshake, the JWT is passed as a query parameter
OR as the first JSON message after the handshake instead of the Authorization
header used elsewhere. Both styles are accepted for backward/forward compatibility.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

import app.core.database as core_db
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
async def notifications_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
):
    await websocket.accept()

    # --- Authenticate ---
    # Strategy 1: token supplied as a query parameter (?token=...).
    #   Preferred because browsers cannot set custom headers on WebSocket handshakes.
    # Strategy 2: token supplied as the first JSON message after the handshake.
    #   Kept for backward compatibility with older frontend builds.
    if not token:
        token = websocket.query_params.get("token")

    if not token:
        try:
            data = await websocket.receive_json()
            token = data.get("token")
        except Exception:
            await websocket.close(code=4401)
            return

    if not token:
        await websocket.close(code=4401)
        return

    db = core_db.SessionLocal()
    try:
        user = _authenticate_ws_token(token, db)
    finally:
        db.close()

    if not user:
        await websocket.close(code=4401)
        return

    await manager.connect(user.id, websocket)
    try:
        while True:
            # Client doesn't need to send anything; we just keep the socket alive
            # and use incoming pings/messages to detect disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)