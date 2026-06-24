import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

// 不应被 HTML 剥离的敏感字段：密码、代码内容等
const EXCLUDE_FIELDS = new Set(['password', 'currentPassword', 'newPassword', 'content', 'code']);

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
      if (EXCLUDE_FIELDS.has(key)) {
        sanitized[key] = val;
      } else {
        sanitized[key] = sanitizeValue(val);
      }
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
    logger.error('Sanitize body failed:', error);
    _res.status(400).json({ error: '请求数据格式错误' });
  }
};
