import { renderFormToHtml, validateRenderRequest, generateTeddyBearXml } from './renderService';
import { htmlToPdfBase64 } from './pdfService';
import { sendMail } from './emailService';

export interface SendRequest {
  formId: unknown;
  draft: unknown;
  targetEmail: unknown;
}

export interface SendSuccess {
  success: true;
}

export interface SendError {
  success: false;
  error: string;
  code?: string;
}

export type SendResult = SendSuccess | SendError;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isValidEmail(v: string): boolean {
  return v.includes('@') && v.trim().length > 1;
}

export async function processSend(req: SendRequest): Promise<SendResult> {
  const { formId, draft, targetEmail } = req;

  const validated = validateRenderRequest(formId, draft);
  if ('error' in validated) {
    return { success: false, error: validated.error, code: 'VALIDATION_ERROR' };
  }

  if (!isNonEmptyString(targetEmail) || !isValidEmail(targetEmail)) {
    return { success: false, error: 'targetEmail must be a valid email address', code: 'VALIDATION_ERROR' };
  }

  const to = targetEmail.trim();
  const schema = validated.formId;
  const draftObj = validated.draft;

  let pdfBase64: string;
  try {
    const html = renderFormToHtml(schema, draftObj);
    pdfBase64 = await htmlToPdfBase64(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    return { success: false, error: message, code: 'PDF_ERROR' };
  }

  const attachments: { filename: string; content: Buffer }[] = [
    { filename: `${schema}_${Date.now()}.pdf`, content: Buffer.from(pdfBase64, 'base64') },
  ];

  if (schema === 'TEDDY_BEAR') {
    const xmlString = generateTeddyBearXml(draftObj);
    attachments.push({
      filename: `teddy_bear_${Date.now()}.xml`,
      content: Buffer.from(xmlString, 'utf-8'),
    });
  }

  try {
    await sendMail({
      to,
      subject: `ParaMate – ${schema} form`,
      text: `Form "${schema}" is attached.`,
      attachments,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Email send failed';
    return { success: false, error: message, code: 'EMAIL_ERROR' };
  }

  return { success: true };
}
