import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const portArgIndex = process.argv.indexOf("--port");
const port = Number(portArgIndex >= 0 ? process.argv[portArgIndex + 1] : process.env.PORT ?? 4174);

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"]
]);

await mkdir(dist, { recursive: true });

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const requested = safePath === "/" ? join(dist, "index.html") : join(dist, safePath);
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
