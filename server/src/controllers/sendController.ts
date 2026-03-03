import { Request, Response } from 'express';
import { processSend } from '../services/sendService';

export const postSend = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body ?? {};
    const result = await processSend({
      formId: body.formId,
      draft: body.draft,
      targetEmail: body.targetEmail,
    });

    if (result.success) {
      res.status(200).json({ success: true });
      return;
    }

    const status =
      result.code === 'VALIDATION_ERROR' ? 400 :
      result.code === 'PDF_ERROR' || result.code === 'EMAIL_ERROR' ? 500 :
      500;

    res.status(status).json({
      success: false,
      error: result.error,
      ...(result.code ? { code: result.code } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    res.status(500).json({ success: false, error: message, code: 'INTERNAL_ERROR' });
  }
};
