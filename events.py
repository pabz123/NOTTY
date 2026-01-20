# events.py
import asyncio
import json

subscribers: list[asyncio.Queue] = []

async def notify(event: dict):
    """Async function to send event to all subscribers."""
    message = json.dumps(event)
    for queue in subscribers:
        await queue.put(message)

def broadcast(event: dict):
    """Synchronous function to send event to all subscribers (non-blocking)."""
    message = json.dumps(event)
    for q in subscribers:
        try:
            q.put_nowait(message)
        except asyncio.QueueFull:
            # Skip if queue is full to avoid blocking
            pass