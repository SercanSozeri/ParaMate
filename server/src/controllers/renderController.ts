import { Request, Response } from 'express';
import {
  renderFormToHtml,
  validateRenderRequest,
  generateTeddyBearXml,
} from '../services/renderService';
import { htmlToPdfBase64 } from '../services/pdfService';

export const postRender = async (req: Request, res: Response): Promise<void> => {
  try {
    const { formId, draft } = req.body ?? {};
    const validated = validateRenderRequest(formId, draft);

    if ('error' in validated) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const html = renderFormToHtml(validated.formId, validated.draft);
    const pdfBase64 = await htmlToPdfBase64(html);

    if (validated.formId === 'TEDDY_BEAR') {
      const xmlString = generateTeddyBearXml(validated.draft);
      res.json({ pdfBase64, xmlString });
      return;
    }

    res.json({ pdf: pdfBase64 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Render failed';
    res.status(500).json({ error: message });
  }
};
