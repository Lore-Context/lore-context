import { add } from "./math";

interface MiniApp {
  get(path: string, handler: (request: { query: Record<string, string> }) => unknown): void;
}

export function sumHandler(request: { query: Record<string, string> }): number {
  return add(Number(request.query.left), Number(request.query.right));
}

export function registerRoutes(app: MiniApp): void {
  app.get("/sum", sumHandler);
}
