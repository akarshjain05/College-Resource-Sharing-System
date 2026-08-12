import asyncio
def test():
    asyncio.create_task(asyncio.sleep(1))
try:
    test()
except Exception as e:
    print("ERROR:", repr(e))
