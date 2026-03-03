import { Router } from 'express';
import { postSend } from '../controllers/sendController';

export const sendRouter = Router();

sendRouter.post('/', postSend);
