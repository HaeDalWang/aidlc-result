import asyncio
import json
from typing import AsyncGenerator


class SSEManager:
    def __init__(self):
        self.admin_queues: dict[int, list[asyncio.Queue]] = {}
        self.table_queues: dict[int, list[asyncio.Queue]] = {}

    async def subscribe_admin(self, store_id: int) -> AsyncGenerator[str, None]:
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self.admin_queues.setdefault(store_id, []).append(queue)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        except GeneratorExit:
            pass
        finally:
            queues = self.admin_queues.get(store_id, [])
            if queue in queues:
                queues.remove(queue)

    async def subscribe_table(self, table_id: int) -> AsyncGenerator[str, None]:
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self.table_queues.setdefault(table_id, []).append(queue)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        except GeneratorExit:
            pass
        finally:
            queues = self.table_queues.get(table_id, [])
            if queue in queues:
                queues.remove(queue)

    async def publish_to_admin(self, store_id: int, event: dict) -> None:
        for queue in list(self.admin_queues.get(store_id, [])):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass

    async def publish_to_table(self, table_id: int, event: dict) -> None:
        for queue in list(self.table_queues.get(table_id, [])):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass
