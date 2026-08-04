import asyncio
import os
import json
from websockets import serve

TMPDIR = os.path.join(os.path.dirname(__file__), 'tmp')
os.makedirs(TMPDIR, exist_ok=True)

async def handler(ws, path):
    session = None
    filepath = None
    try:
        async for msg in ws:
            # text messages are control JSON
            if isinstance(msg, str):
                try:
                    obj = json.loads(msg)
                    evt = obj.get('event')
                    session = obj.get('session') or session
                    if evt == 'start' and session:
                        filepath = os.path.join(TMPDIR, f'ptt-{session}.webm')
                        try:
                            if os.path.exists(filepath):
                                os.remove(filepath)
                        except Exception:
                            pass
                        await ws.send(json.dumps({'status':'started','session':session}))
                    elif evt == 'stop' and session:
                        await ws.send(json.dumps({'status':'stopping','session':session}))
                        # let caller finalize by HTTP call to daemon or watch file
                        await ws.send(json.dumps({'status':'stopped','session':session}))
                except Exception:
                    await ws.send(json.dumps({'error':'invalid_control'}))
            else:
                # binary chunk
                if session and filepath:
                    try:
                        with open(filepath, 'ab') as f:
                            f.write(msg)
                        await ws.send(json.dumps({'status':'chunk_received','session':session}))
                    except Exception:
                        await ws.send(json.dumps({'error':'write_failed'}))
    except Exception:
        pass

async def main():
    async with serve(handler, '127.0.0.1', 8790, max_size=2**20):
        await asyncio.Future()

def run():
    try:
        asyncio.run(main())
    except Exception:
        pass

if __name__ == '__main__':
    run()

