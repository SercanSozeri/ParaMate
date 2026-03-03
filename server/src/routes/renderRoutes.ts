import { Router } from 'express';
import { postRender } from '../controllers/renderController';

export const renderRouter = Router();

renderRouter.post('/', postRender);
