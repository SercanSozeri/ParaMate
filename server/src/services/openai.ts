/**
 * OpenAI-compatible Chat Completion call.
 * Returns strict JSON: { intent, formId?, entities? }.
 * No AI-invented values; only classification and extraction from user message.
 */

export type ChatIntent =
  | 'start_form'
  | 'fill_field'
  | 'show_summary'
  | 'submit'
  | 'edit'
  | 'help';

export interface ChatCompletionPayload {
  intent: ChatIntent;
  formId?: string;
  entities?: Record<string, unknown>;
}

export interface ChatContext {
  formId?: string;
  formTitle?: string;
  nextMissingFieldKey?: string;
  nextMissingFieldLabel?: string;
  availableFormIds: string[];
}

const INTENTS: ChatIntent[] = [
  'start_form',
  'fill_field',
  'show_summary',
  'submit',
  'edit',
  'help',
];

function buildSystemPrompt(context: ChatContext): string {
  const lines: string[] = [
    'You are a form-filling assistant. Reply with ONLY a single JSON object, no other text.',
    `Valid intents: ${INTENTS.join(', ')}.`,
    '',
    'Rules:',
    '- start_form: user wants to start a form. Include "formId" with one of: ' +
      context.availableFormIds.join(', ') + '.',
    '- fill_field: user is providing data for the current form. Include "entities" with key-value pairs that match the form fields. Only include fields the user explicitly mentioned; do NOT invent values.',
    '- show_summary: user wants to see current draft/summary.',
    '- submit: user wants to submit the form.',
    '- edit: user wants to change something already entered.',
    '- help: user needs help or is unclear.',
    '',
    'Output format (strict):',
    '{"intent":"<intent>","formId":"<id only if start_form>","entities":{<only fields user stated>}}',
  ];

  if (context.formId) {
    lines.push('', `Current form: ${context.formId}${context.formTitle ? ` (${context.formTitle})` : ''}.`);
    if (context.nextMissingFieldKey) {
      lines.push(`Next required field: ${context.nextMissingFieldKey}${context.nextMissingFieldLabel ? ` (${context.nextMissingFieldLabel})` : ''}.`);
    }
  }

  return lines.join('\n');
}

function parsePayload(body: string): ChatCompletionPayload {
  const raw = JSON.parse(body) as unknown;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid JSON from model');
  }
  const o = raw as Record<string, unknown>;
  const intent = o.intent as string;
  if (!INTENTS.includes(intent as ChatIntent)) {
    throw new Error(`Unknown intent: ${intent}`);
  }
  const result: ChatCompletionPayload = {
    intent: intent as ChatIntent,
  };
  if (typeof o.formId === 'string') result.formId = o.formId;
  if (o.entities && typeof o.entities === 'object' && !Array.isArray(o.entities)) {
    result.entities = o.entities as Record<string, unknown>;
  }
  return result;
}

export async function getChatIntent(
  userMessage: string,
  context: ChatContext,
): Promise<ChatCompletionPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const systemContent = buildSystemPrompt(context);

  const body = {
    model: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('No content in OpenAI response');
  }

  return parsePayload(content);
}
