import { Request, Response, NextFunction } from 'express';

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return stripHtml(value.trim());
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
}

export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body) as Record<string, unknown>;
    }
    next();
  } catch (error) {
    next();
  }
};
