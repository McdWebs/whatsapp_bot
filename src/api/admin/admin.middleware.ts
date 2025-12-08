import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey || apiKey !== config.admin.apiKey) {
    logger.warn('Unauthorized admin access attempt', { ip: req.ip, path: req.path });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

