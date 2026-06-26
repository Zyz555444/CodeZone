import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';

export function writeSSEEvent(res: Response, data: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function setupSSEConnection(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
}

export function createAbortController(req: AuthRequest): AbortController {
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());
  return abortController;
}
