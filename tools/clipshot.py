#!/usr/bin/env python3
"""Capture a clipped region of a page at natural layout (no scroll, no 100vh blowup).
Usage: clipshot.py <url> <out.png> <y> <height> [width]
Reuses the CDP WS client from shot.py. Chrome must run with --remote-debugging-port (CDP_PORT).
"""
import sys, os, base64, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shot import WS, http_get

url, out = sys.argv[1], sys.argv[2]
y = int(sys.argv[3]); h = int(sys.argv[4])
width = int(sys.argv[5]) if len(sys.argv) > 5 else 1400

targets = [t for t in http_get("/json/list") if t.get("type") == "page"]
ws = WS(targets[0]["webSocketDebuggerUrl"])
ws.send("Page.enable")
ws.send("Emulation.setDeviceMetricsOverride",
        {"width": width, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
nav = ws.send("Page.navigate", {"url": url}); ws.wait(msg_id=nav)
try: ws.wait(method="Page.loadEventFired", timeout=20)
except Exception: pass
time.sleep(3.5)
sid = ws.send("Page.captureScreenshot", {
    "format": "png", "fromSurface": True, "captureBeyondViewport": True,
    "clip": {"x": 0, "y": y, "width": width, "height": h, "scale": 1}})
res = ws.wait(msg_id=sid, timeout=40)
open(out, "wb").write(base64.b64decode(res["result"]["data"]))
print("saved", out)
