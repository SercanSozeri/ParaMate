import type { FormField } from '../forms/types';
import { FormId, FORM_SCHEMA_BY_ID, isFormId } from '../forms';
import type { ChatContext, ChatCompletionPayload } from './openai';
import {
  getSession,
  startForm,
  updateDraft,
  getSummary,
  getNextMissingField,
  isComplete,
} from './formEngine';

function getField(formId: FormId, fieldKey: string): FormField | undefined {
  const schema = FORM_SCHEMA_BY_ID[formId];
  for (const section of schema.sections) {
    const field = section.fields.find((f) => f.key === fieldKey);
    if (field) return field;
  }
  return undefined;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
}

export interface ChatResponse {
  assistantMessage: string;
  updatedDraft: Record<string, unknown>;
  missingRequiredFields: string[];
  isComplete: boolean;
}

function getFieldLabel(formId: FormId, fieldKey: string): string | undefined {
  const schema = FORM_SCHEMA_BY_ID[formId];
  for (const section of schema.sections) {
    const field = section.fields.find((f) => f.key === fieldKey);
    if (field) return field.label;
  }
  return undefined;
}

function buildContext(sessionId: string): ChatContext {
  const session = getSession(sessionId);
  const availableFormIds = Object.keys(FORM_SCHEMA_BY_ID) as FormId[];

  if (!session) {
    return { availableFormIds };
  }

  const nextKey = getNextMissingField(sessionId);
  const nextField = nextKey ? getField(session.formId, nextKey) : undefined;
  const schema = FORM_SCHEMA_BY_ID[session.formId];

  return {
    formId: session.formId,
    formTitle: schema.title,
    nextMissingFieldKey: nextKey,
    nextMissingFieldLabel: nextField?.label ?? nextKey,
    nextMissingFieldExample: nextField?.example,
    availableFormIds,
  };
}

function formatDraftSummary(draft: Record<string, unknown>): string {
  const parts = Object.entries(draft)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`);
  return parts.length ? parts.join('; ') : 'No fields filled yet.';
}

/** Short phrase for what was just recorded (conversational confirmation). */
function formatRecordedPhrase(
  formId: FormId,
  entities: Record<string, unknown>,
): string {
  const keys = Object.keys(entities).filter(
    (k) => {
      const v = entities[k];
      return v !== undefined && v !== null && (typeof v !== 'string' || v.trim() !== '');
    },
  );
  if (keys.length === 0) return '';

  // Natural phrasing for primary medic (first, last, number)
  const pFirst = entities.primaryFirstName as string | undefined;
  const pLast = entities.primaryLastName as string | undefined;
  const pNum = entities.primaryMedicNumber as string | undefined;
  if (
    keys.length === 3 &&
    keys.includes('primaryFirstName') &&
    keys.includes('primaryLastName') &&
    keys.includes('primaryMedicNumber') &&
    [pFirst, pLast, pNum].every((v) => typeof v === 'string' && v.trim())
  ) {
    return `Primary medic ${String(pFirst).trim()} ${String(pLast).trim()}, ID ${String(pNum).trim()} recorded.`;
  }
  // Secondary medic
  const sFirst = entities.secondaryFirstName as string | undefined;
  const sLast = entities.secondaryLastName as string | undefined;
  const sNum = entities.secondaryMedicNumber as string | undefined;
  if (
    keys.length === 3 &&
    keys.includes('secondaryFirstName') &&
    keys.includes('secondaryLastName') &&
    keys.includes('secondaryMedicNumber') &&
    [sFirst, sLast, sNum].every((v) => typeof v === 'string' && v.trim())
  ) {
    return `Secondary medic ${String(sFirst).trim()} ${String(sLast).trim()}, ID ${String(sNum).trim()} recorded.`;
  }

  const parts: string[] = [];
  for (const key of keys) {
    const val = entities[key];
    const label = getFieldLabel(formId, key);
    const labelShort = label ?? key;
    parts.push(`${labelShort}: ${val}`);
  }
  if (parts.length === 1) return `${parts[0]} recorded.`;
  return `Recorded: ${parts.join('. ')}.`;
}

const TRANSITIONS = ['Perfect.', 'Got it.', 'Thank you.', 'Alright.', 'Okay.'] as const;
let _transitionIndex = 0;
function nextTransition(): string {
  const t = TRANSITIONS[_transitionIndex % TRANSITIONS.length];
  _transitionIndex += 1;
  return t;
}

export async function handleChat(
  getIntent: (message: string, context: ChatContext) => Promise<ChatCompletionPayload>,
  req: ChatRequest,
): Promise<ChatResponse> {
  const { sessionId, message } = req;
  const trimmedMessage = (message ?? '').trim();
  if (!trimmedMessage) {
    const session = getSession(sessionId);
    const draft = session ? { ...session.draft } : {};
    const missing = session ? [...session.missingRequiredFields] : [];
    return {
      assistantMessage: 'Please send a message. You can start a form (e.g. "Start occurrence report") or ask for help.',
      updatedDraft: draft,
      missingRequiredFields: missing,
      isComplete: missing.length === 0,
    };
  }

  const context = buildContext(sessionId);
  const payload = await getIntent(trimmedMessage, context);

  switch (payload.intent) {
    case 'start_form': {
      const formIdRaw = payload.formId;
      if (!formIdRaw || !isFormId(formIdRaw)) {
        return {
          assistantMessage: `Which form would you like? Available: ${context.availableFormIds.join(', ')}.`,
          updatedDraft: getSession(sessionId)?.draft ?? {},
          missingRequiredFields: getSession(sessionId)?.missingRequiredFields ?? [],
          isComplete: false,
        };
      }
      const state = startForm(sessionId, formIdRaw);
      const schema = FORM_SCHEMA_BY_ID[formIdRaw];

      // Conversational forms (e.g. shift_report) do NOT use sequential required fields.
      if (schema.conversationalMode) {
        return {
          assistantMessage: `Started "${schema.title}". You can ask things like "Do I have night shift this week?" or "How many shifts in March?".`,
          updatedDraft: { ...state.draft },
          missingRequiredFields: [...state.missingRequiredFields],
          isComplete: false,
        };
      }

      const firstMissing = state.missingRequiredFields[0];
      const firstField = firstMissing ? getField(formIdRaw, firstMissing) : undefined;
      const firstLabel = firstField?.label ?? firstMissing;
      const firstExample = firstField?.example;
      const askPhrase = firstExample
        ? `First I need ${firstLabel}. For example: ${firstExample}.`
        : `First I need ${firstLabel}.`;
      return {
        assistantMessage: `Alright. Let's get started with ${schema.title}. ${askPhrase}`,
        updatedDraft: { ...state.draft },
        missingRequiredFields: [...state.missingRequiredFields],
        isComplete: false,
      };
    }

    case 'fill_field': {
      const session = getSession(sessionId);
      if (!session) {
        return {
          assistantMessage: 'No form in progress. Say something like "Start occurrence report" when you\'re ready.',
          updatedDraft: {},
          missingRequiredFields: [],
          isComplete: false,
        };
      }
      const entities = payload.entities ?? {};
      const result = updateDraft(sessionId, entities);

      if (result.validationErrors.length > 0) {
        return {
          assistantMessage: result.validationErrors[0],
          updatedDraft: { ...result.draft },
          missingRequiredFields: [...result.missingRequiredFields],
          isComplete: result.missingRequiredFields.length === 0,
        };
      }

      if (result.missingRequiredFields.length === 0) {
        return {
          assistantMessage: `Perfect. Form is complete. Summary: ${formatDraftSummary(result.draft)}. You can say submit to confirm or summary to review.`,
          updatedDraft: { ...result.draft },
          missingRequiredFields: [],
          isComplete: true,
        };
      }

      const nextKey = result.missingRequiredFields[0];
      const nextField = getField(result.formId, nextKey);
      const nextLabel = nextField?.label ?? nextKey;
      const nextExample = nextField?.example;
      const nextPhrase = nextExample
        ? `Next I need ${nextLabel}. For example: ${nextExample}.`
        : `Next I need ${nextLabel}.`;
      const recorded = formatRecordedPhrase(result.formId, entities);
      const transition = nextTransition();
      const confirmation = recorded ? `${transition} ${recorded} ` : `${transition} `;
      return {
        assistantMessage: `${confirmation}${nextPhrase}`,
        updatedDraft: { ...result.draft },
        missingRequiredFields: [...result.missingRequiredFields],
        isComplete: false,
      };
    }

    case 'show_summary': {
      const s = getSession(sessionId);
      if (!s) {
        return {
          assistantMessage: 'No form in progress. Start a form first when you\'re ready.',
          updatedDraft: {},
          missingRequiredFields: [],
          isComplete: false,
        };
      }
      const summary = getSummary(sessionId);
      const msg = summary.isComplete
        ? `Here's the summary: ${formatDraftSummary(summary.draft)}.`
        : `Here's what we have so far: ${formatDraftSummary(summary.draft)}. Still need: ${summary.missingRequiredFields.map((k) => getFieldLabel(s.formId, k) ?? k).join(', ')}.`;
      return {
        assistantMessage: msg,
        updatedDraft: { ...summary.draft },
        missingRequiredFields: [...summary.missingRequiredFields],
        isComplete: summary.isComplete,
      };
    }

    case 'submit': {
      const s = getSession(sessionId);
      if (!s) {
        return {
          assistantMessage: 'There\'s no form in progress. Start a form first if you\'d like.',
          updatedDraft: {},
          missingRequiredFields: [],
          isComplete: false,
        };
      }
      const complete = isComplete(sessionId);
      const summary = getSummary(sessionId);
      let msg: string;
      if (complete) {
        msg = `All set. Form is ready to submit. Summary: ${formatDraftSummary(summary.draft)}. Use the app to generate and send the PDF when you\'re ready.`;
      } else {
        const missingLabels = summary.missingRequiredFields
          .map((key) => getFieldLabel(s.formId, key) ?? key)
          .join(', ');
        msg = `I still need a few things before we can submit: ${missingLabels}. Could you provide those?`;
      }
      return {
        assistantMessage: msg,
        updatedDraft: { ...summary.draft },
        missingRequiredFields: [...summary.missingRequiredFields],
        isComplete: complete,
      };
    }

    case 'edit':
    case 'help':
    default: {
      const s = getSession(sessionId);
      const draft = s ? { ...s.draft } : {};
      const missing = s ? [...s.missingRequiredFields] : [];
      const helpText =
        payload.intent === 'help'
          ? 'Sure. You can start a form, give me the values as we go, ask for a summary, or say submit. I only use what you tell me.'
          : 'Tell me which field to change, or ask for a summary.';
      return {
        assistantMessage: helpText,
        updatedDraft: draft,
        missingRequiredFields: missing,
        isComplete: missing.length === 0,
      };
    }
  }
}
