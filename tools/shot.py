#!/usr/bin/env python3
"""Full-page screenshot via Chrome DevTools Protocol (stdlib only).
Usage: shot.py <url> <out.png> [width] [full|viewport]
Assumes Chrome is already running with --remote-debugging-port=9222.
"""
import sys, json, base64, socket, struct, os, time, urllib.request, hashlib

PORT = int(os.environ.get("CDP_PORT", "9222"))


def http_get(path):
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}{path}", timeout=10) as r:
        return json.load(r)


class WS:
    def __init__(self, url):
        # ws://127.0.0.1:9222/devtools/page/XXXX
        host_port, _, path = url[5:].partition("/")
        host, _, port = host_port.partition(":")
        self.s = socket.create_connection((host, int(port or 80)), timeout=15)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (f"GET /{path} HTTP/1.1\r\nHost: {host_port}\r\n"
               "Upgrade: websocket\r\nConnection: Upgrade\r\n"
               f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
        self.s.sendall(req.encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(4096)
        self._buf = buf.split(b"\r\n\r\n", 1)[1]
        self._id = 0

    def send(self, method, params=None):
        self._id += 1
        payload = json.dumps({"id": self._id, "method": method, "params": params or {}}).encode()
        header = b"\x81"  # FIN + text
        n = len(payload)
        mask = os.urandom(4)
        if n < 126:
            header += struct.pack("B", 0x80 | n)
        elif n < 65536:
            header += struct.pack("!BH", 0x80 | 126, n)
        else:
            header += struct.pack("!BQ", 0x80 | 127, n)
        header += mask
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        self.s.sendall(header + masked)
        return self._id

    def _read_frame(self):
        def need(n):
            while len(self._buf) < n:
                self._buf += self.s.recv(65536)
        need(2)
        b1, b2 = self._buf[0], self._buf[1]
        ln = b2 & 0x7F
        idx = 2
        if ln == 126:
            need(4); ln = struct.unpack("!H", self._buf[2:4])[0]; idx = 4
        elif ln == 127:
            need(10); ln = struct.unpack("!Q", self._buf[2:10])[0]; idx = 10
        need(idx + ln)
        data = self._buf[idx:idx + ln]
        self._buf = self._buf[idx + ln:]
        return data

    def wait(self, msg_id=None, method=None, timeout=30):
        end = time.time() + timeout
        while time.time() < end:
            data = self._read_frame()
            try:
                m = json.loads(data)
            except Exception:
                continue
            if msg_id is not None and m.get("id") == msg_id:
                return m
            if method is not None and m.get("method") == method:
                return m
        raise TimeoutError(method or msg_id)


def main():
    url, out = sys.argv[1], sys.argv[2]
    width = int(sys.argv[3]) if len(sys.argv) > 3 else 1400
    mode = sys.argv[4] if len(sys.argv) > 4 else "full"
    targets = [t for t in http_get("/json/list") if t.get("type") == "page"]
    ws = WS(targets[0]["webSocketDebuggerUrl"])
    ws.send("Page.enable")
    ws.send("Emulation.setDeviceMetricsOverride", {
        "width": width, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
    nav = ws.send("Page.navigate", {"url": url})
    ws.wait(msg_id=nav)
    try:
        ws.wait(method="Page.loadEventFired", timeout=20)
    except TimeoutError:
        pass
    # let fonts/canvas/videos settle
    t = time.time() + 4
    while time.time() < t:
        ws._read_frame() if False else time.sleep(0.2)
    params = {"format": "png", "fromSurface": True, "captureBeyondViewport": True}
    if mode == "full":
        mid = ws.send("Page.getLayoutMetrics")
        lm = ws.wait(msg_id=mid)["result"]
        css = lm.get("cssContentSize") or lm.get("contentSize")
        h = int(css["height"])
        ws.send("Emulation.setDeviceMetricsOverride", {
            "width": width, "height": h, "deviceScaleFactor": 1, "mobile": False})
        time.sleep(1.0)
        params["clip"] = {"x": 0, "y": 0, "width": width, "height": h, "scale": 1}
    sid = ws.send("Page.captureScreenshot", params)
    res = ws.wait(msg_id=sid, timeout=40)
    with open(out, "wb") as f:
        f.write(base64.b64decode(res["result"]["data"]))
    print(f"saved {out}")


if __name__ == "__main__":
    main()
