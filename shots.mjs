// Takes the entry's screenshots: serves app/, opens each scene named in
// shots.json in headless Chromium, waits for the app to flag the scene
// painted (window.__shotReady), and saves the capture into screenshots/.
//   node shots.mjs
// Chromium is found at $CHROME, /opt/meta-chromium/chrome, or on PATH.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = fileURLToPath(new URL(".", import.meta.url));
const PORT = 8123;
const CDP_PORT = 9333;
const scenes = JSON.parse(readFileSync(join(repoDir, "shots.json"), "utf8"));

const chromePath = [
  process.env.CHROME,
  "/opt/meta-chromium/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].find((p) => p && existsSync(p));
if (!chromePath) throw new Error("no Chromium binary found");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error(`timed out waiting for ${url}`);
}

// A minimal CDP client: one WebSocket, numbered requests, no dependencies.
// Page commands need a target session, so call attachToPage() first; from
// then on every request carries that session id.
function cdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  let sessionId = null;
  const pending = new Map();
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
    }
  };
  const ready = new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  const client = {
    ready,
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        const payload = { id, method, params };
        if (sessionId) payload.sessionId = sessionId;
        ws.send(JSON.stringify(payload));
      });
    },
    async attachToPage() {
      const { targetInfos } = await client.send("Target.getTargets");
      const page = targetInfos.find((t) => t.type === "page");
      if (!page) throw new Error("no page target to attach to");
      const attached = await client.send("Target.attachToTarget", {
        targetId: page.targetId,
        flatten: true,
      });
      sessionId = attached.sessionId;
    },
    close() {
      ws.close();
    },
  };
  return client;
}

async function shootScene(scene) {
  // This Chromium build blocks loopback HTTP from a public context
  // (ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS), so scenes are opened as
  // file:// pages — which is also how the app must work offline anyway.
  // --allow-file-access-from-files lets the page's ES modules load.
  const url = `file://${join(repoDir, "app", "index.html")}${scene.query}`;
  // This Chromium build refuses to start without its WebGL domain policy:
  // the allowed-domains file and its sha256, both under /var/lib/hatch-browser.
  const policyFile = "/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt";
  const policyHash = "8097045f0459c96c4cdc76e3a1af4e0f43f640b4b59c43d6db35e3641c0264c6";
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--allow-file-access-from-files",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--remote-debugging-port=${CDP_PORT}`,
      `--window-size=${scene.w},${scene.h}`,
      `--user-data-dir=/tmp/cover-shots-profile-${scene.name}`,
      `--hatch-webgl-allowed-domains-file=${policyFile}`,
      `--hatch-webgl-allowed-domains-sha256=${policyHash}`,
      url,
    ],
    { stdio: "ignore" },
  );
  try {
    const version = await (await waitFor(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
    const cdp = cdpClient(version.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.attachToPage();
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: scene.w,
      height: scene.h,
      deviceScaleFactor: 1,
      mobile: false,
    });
    // Poll until the app says the scene is painted (or give up after 20 s).
    let readyFlag = false;
    for (let i = 0; i < 80 && !readyFlag; i++) {
      const result = await cdp.send("Runtime.evaluate", {
        expression: "window.__shotReady === true",
        returnByValue: true,
      });
      readyFlag = result?.result?.value === true;
      if (!readyFlag) await sleep(250);
    }
    if (!readyFlag) throw new Error(`scene ${scene.name} never flagged ready`);
    await sleep(150);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    cdp.close();
    return Buffer.from(shot.data, "base64");
  } finally {
    chrome.kill("SIGKILL");
  }
}

try {
  mkdirSync(join(repoDir, "screenshots"), { recursive: true });
  mkdirSync("/tmp/cover-shots", { recursive: true });
  for (const scene of scenes) {
    const png = await shootScene(scene);
    const rawPath = join("/tmp/cover-shots", scene.name.replace(/\.(jpg|jpeg)$/i, ".png"));
    writeFileSync(rawPath, png);
    console.log(`captured ${scene.name} (${png.length} bytes raw)`);
  }
} finally {
  // nothing to stop: each scene's Chromium was already killed in shootScene
}
console.log("raw captures in /tmp/cover-shots — convert them into screenshots/ next");
