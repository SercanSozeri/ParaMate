import nodemailer from 'nodemailer';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  attachments?: EmailAttachment[];
}

/**
 * Send email via SMTP. Uses env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL.
 * Do not log transporter options or any env vars that may contain credentials.
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.FROM_EMAIL;

  if (!host || !port) {
    throw new Error('SMTP_HOST and SMTP_PORT must be set');
  }
  if (!from || !from.trim()) {
    throw new Error('FROM_EMAIL must be set');
  }

  const portNum = parseInt(port, 10);
  if (Number.isNaN(portNum) || portNum <= 0) {
    throw new Error('SMTP_PORT must be a valid port number');
  }

  const transporter = nodemailer.createTransport({
    host,
    port: portNum,
    secure: portNum === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from: from.trim(),
    to: options.to,
    subject: options.subject,
    text: options.text ?? 'Please see attachments.',
    attachments: options.attachments,
  });
}
