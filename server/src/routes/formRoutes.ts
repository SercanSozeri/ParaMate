import { Router } from 'express';
import { getForm, getForms } from '../controllers/formController';

export const formRouter = Router();

formRouter.get('/', getForms);
formRouter.get('/:id', getForm);

