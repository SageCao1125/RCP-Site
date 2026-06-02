#!/usr/bin/env python3
"""Scroll a selector into view, then screenshot the viewport (CDP).
Usage: ashot.py <url> <out.png> <selector> [width] [height]
Chrome must run with --remote-debugging-port (CDP_PORT). Use ?frame=<0..1> in url to freeze an animation frame.
"""
import sys, os, base64, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shot import WS, http_get

url, out, sel = sys.argv[1], sys.argv[2], sys.argv[3]
width = int(sys.argv[4]) if len(sys.argv) > 4 else 1280
height = int(sys.argv[5]) if len(sys.argv) > 5 else 900

ws = WS([t for t in http_get("/json/list") if t.get("type") == "page"][0]["webSocketDebuggerUrl"])
ws.send("Page.enable"); ws.send("Runtime.enable")
ws.send("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False})
nav = ws.send("Page.navigate", {"url": url}); ws.wait(msg_id=nav)
try: ws.wait(method="Page.loadEventFired", timeout=20)
except Exception: pass
time.sleep(2.0)
ev = ws.send("Runtime.evaluate", {"expression": f"document.querySelector('{sel}').scrollIntoView({{block:'center'}}); 1"})
ws.wait(msg_id=ev)
time.sleep(2.0)
sid = ws.send("Page.captureScreenshot", {"format": "png", "fromSurface": True})
res = ws.wait(msg_id=sid, timeout=40)
open(out, "wb").write(base64.b64decode(res["result"]["data"]))
print("saved", out)
