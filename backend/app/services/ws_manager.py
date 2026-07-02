"""
In-memory WebSocket connection registry, keyed by user ID.

Notifications are created from synchronous route handlers (regular SQLAlchemy
sessions), but broadcasting must happen on the asyncio event loop that owns
the WebSocket. We capture the loop at startup and use
`asyncio.run_coroutine_threadsafe` to safely hop from the sync worker thread
back onto that loop.
"""
import asyncio
import json
import logging
import uuid
from typing import Dict, Set

from fastapi import WebSocket

logger = logging.getLogger("crss")


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: Dict[str, Set[WebSocket]] = {}
        self.main_loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self.main_loop = loop

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        key = str(user_id)
        self._connections.setdefault(key, set()).add(websocket)

    def disconnect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        key = str(user_id)
        if key in self._connections:
            self._connections[key].discard(websocket)
            if not self._connections[key]:
                del self._connections[key]

    async def _send_to_user(self, user_id: uuid.UUID, payload: dict) -> None:
        key = str(user_id)
        dead_sockets = []
        for ws in self._connections.get(key, set()):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead_sockets.append(ws)
        for ws in dead_sockets:
            self._connections[key].discard(ws)

    def notify_user(self, user_id: uuid.UUID, payload: dict) -> None:
        """
        Thread-safe entrypoint callable from synchronous route handlers.
        No-op if the event loop hasn't been bound yet or the user isn't connected.
        """
        if self.main_loop is None:
            return
        try:
            asyncio.run_coroutine_threadsafe(self._send_to_user(user_id, payload), self.main_loop)
        except RuntimeError:
            logger.warning("Could not schedule WebSocket notification; event loop unavailable")


manager = ConnectionManager()
