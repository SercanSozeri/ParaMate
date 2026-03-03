import { Request, Response } from 'express';
import { getFormById, listForms } from '../services/formService';

export const getForms = (_req: Request, res: Response) => {
  const result = listForms();
  return res.json(result);
};

export const getForm = (req: Request, res: Response) => {
  const { id } = req.params;
  const result = getFormById(id);

  if (!result) {
    return res.status(404).json({ error: 'Form not found' });
  }

  return res.json(result);
};

