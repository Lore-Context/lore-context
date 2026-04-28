import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const portArgIndex = process.argv.indexOf("--port");
const port = Number(portArgIndex >= 0 ? process.argv[portArgIndex + 1] : process.env.PORT ?? 4174);

const mime = new Map([
  ["", "text/plain; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".ico", "image/x-icon"]
]);

await mkdir(dist, { recursive: true });

const server = createServer((request, response) => {
  let url;
  try {
    url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  } catch {
    response.statusCode = 400;
    response.end("Bad request");
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    response.statusCode = 400;
    response.end("Bad request");
    return;
  }

  const safePath = normalize(decodedPath).replace(/^[/\\]+/, "").replace(/^(\.\.(?:[/\\]|$))+/, "");
  const requested = safePath === "" ? join(dist, "index.html") : join(dist, safePath);
  if (!requested.startsWith(`${dist}${sep}`)) {
    response.statusCode = 403;
    response.end("Forbidden");
    return;
  }

  const filePath =
    existsSync(requested) && statSync(requested).isDirectory()
      ? join(requested, "index.html")
      : requested;
  const fallback = join(dist, "index.html");
  const target = existsSync(filePath) && statSync(filePath).isFile() ? filePath : fallback;

  response.setHeader("content-type", mime.get(extname(target)) ?? "application/octet-stream");
  createReadStream(target)
    .on("error", () => {
      response.statusCode = 404;
      response.end("Not found");
    })
    .pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Lore website available at http://127.0.0.1:${port}`);
});
