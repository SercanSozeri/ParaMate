import { Request, Response } from 'express';
import { checkHealth } from '../services/healthService';

export const getHealth = (_req: Request, res: Response) => {
  const result = checkHealth();
  return res.json(result);
};

