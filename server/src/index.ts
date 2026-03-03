import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/healthRoutes';
import { formRouter } from './routes/formRoutes';
import { chatRouter } from './routes/chatRoutes';
import { renderRouter } from './routes/renderRoutes';
import { sendRouter } from './routes/sendRoutes';
import { logger } from './utils/logger';

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/forms', formRouter);
app.use('/chat', chatRouter);
app.use('/render', renderRouter);
app.use('/send', sendRouter);

app.get('/', (_req, res) => {
  res.send('ParaMate API');
});

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

