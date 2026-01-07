# events.py
import asyncio

subscribers: list[asyncio.Queue] = []

async def notify(event: dict):
    for queue in subscribers:
        await queue.put(event)