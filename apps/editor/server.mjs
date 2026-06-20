import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import { platform } from "node:os";
import { spawn } from "node:child_process";
import { dirname, extname, isAbsolute, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 5173);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    if (url.pathname === "/__pixi/reveal") {
      await handleRevealRequest(request, response);
      return;
    }

    const pathname = getStaticPathname(url.pathname);
    const filePath = normalize(join(root, pathname));

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mime[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end(error.code === "ENOENT" ? "Not found" : error.stack);
  }
}).listen(port, () => {
  console.log(`Pixi UI Editor dev server: http://localhost:${port}`);
});

function getStaticPathname(pathname) {
  if (pathname === "/") {
    return "/index.html";
  }
  if (pathname === "/apps/editor/") {
    return "/apps/editor/index.html";
  }
  return pathname;
}

async function handleRevealRequest(request, response) {
  if (request.method !== "POST" || request.headers["x-pixi-editor-action"] !== "reveal") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const body = await readRequestBody(request, 64 * 1024);
  const payload = JSON.parse(body || "{}");
  const targetPath = normalize(String(payload.path || ""));
  const revealMode = payload.reveal === "folder" ? "folder" : "default";
  if (!targetPath || !isAbsolute(targetPath)) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Reveal path must be absolute.");
    return;
  }

  await revealPath(targetPath, revealMode);
  response.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify({ ok: true }));
}

function readRequestBody(request, limit) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function revealPath(targetPath, revealMode = "default") {
  const info = await stat(targetPath);
  const folderPath = info.isDirectory() ? targetPath : dirname(targetPath);
  if (revealMode === "folder") {
    launchFolder(folderPath);
    return;
  }

  const os = platform();
  if (os === "darwin") {
    launch("open", info.isDirectory() ? [targetPath] : ["-R", targetPath]);
    return;
  }
  if (os === "win32") {
    launch("explorer.exe", info.isDirectory() ? [targetPath] : [`/select,${targetPath}`]);
    return;
  }

  launch("xdg-open", [folderPath]);
}

function launchFolder(folderPath) {
  const os = platform();
  if (os === "darwin") {
    launch("open", [folderPath]);
    return;
  }
  if (os === "win32") {
    launch("explorer.exe", [folderPath]);
    return;
  }

  launch("xdg-open", [folderPath]);
}

function launch(command, args) {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}
