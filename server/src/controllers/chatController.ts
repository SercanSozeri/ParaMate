import { Request, Response } from 'express';
import { getChatIntent } from '../services/openai';
import { handleChat } from '../services/chatService';

export interface ChatRequestBody {
  sessionId?: unknown;
  message?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string';
}

export const postChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as ChatRequestBody;
    const sessionId = body.sessionId;
    const message = body.message;

    if (!isNonEmptyString(sessionId)) {
      res.status(400).json({ error: 'sessionId must be a non-empty string' });
      return;
    }
    if (message !== undefined && message !== null && !isNonEmptyString(message)) {
      res.status(400).json({ error: 'message must be a string' });
      return;
    }

    const result = await handleChat(getChatIntent, {
      sessionId,
      message: typeof message === 'string' ? message : '',
    });

    res.json({
      assistantMessage: result.assistantMessage,
      updatedDraft: result.updatedDraft,
      missingRequiredFields: result.missingRequiredFields,
      isComplete: result.isComplete,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
};
