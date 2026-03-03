import { Router } from 'express';
import { postChat } from '../controllers/chatController';

export const chatRouter = Router();

chatRouter.post('/', postChat);
