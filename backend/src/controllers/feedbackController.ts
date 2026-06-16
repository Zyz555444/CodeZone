import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const createFeedbackSchema = z.object({
  type: z.enum(['feature', 'bug', 'performance', 'other']),
  content: z.string().min(1, '反馈内容不能为空').max(2000),
  contact: z.string().optional(),
});

export const createFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createFeedbackSchema.parse(req.body);

    logger.info('用户反馈', {
      userId: req.userId,
      type: body.type,
      content: body.content.substring(0, 200),
      contact: body.contact,
    });

    res.status(201).json({ message: '反馈已提交' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '验证失败', details: error.errors });
      return;
    }
    logger.error('提交反馈失败', { error, userId: req.userId });
    res.status(500).json({ error: '提交反馈失败' });
  }
};
