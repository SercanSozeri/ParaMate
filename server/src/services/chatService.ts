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
  const nextLabel = nextKey ? getFieldLabel(session.formId, nextKey) : undefined;
  const schema = FORM_SCHEMA_BY_ID[session.formId];

  return {
    formId: session.formId,
    formTitle: schema.title,
    nextMissingFieldKey: nextKey,
    nextMissingFieldLabel: nextLabel ?? nextKey,
    availableFormIds,
  };
}

function formatDraftSummary(draft: Record<string, unknown>): string {
  const parts = Object.entries(draft)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`);
  return parts.length ? parts.join('; ') : 'No fields filled yet.';
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
          assistantMessage: `Please choose a form to start. Available: ${context.availableFormIds.join(', ')}.`,
          updatedDraft: getSession(sessionId)?.draft ?? {},
          missingRequiredFields: getSession(sessionId)?.missingRequiredFields ?? [],
          isComplete: false,
        };
      }
      const state = startForm(sessionId, formIdRaw);
      const firstMissing = state.missingRequiredFields[0];
      const firstLabel = firstMissing ? getFieldLabel(formIdRaw, firstMissing) : undefined;
      return {
        assistantMessage: `Started "${FORM_SCHEMA_BY_ID[formIdRaw].title}". Please provide: ${firstLabel ?? firstMissing}.`,
        updatedDraft: { ...state.draft },
        missingRequiredFields: [...state.missingRequiredFields],
        isComplete: false,
      };
    }

    case 'fill_field': {
      const session = getSession(sessionId);
      if (!session) {
        return {
          assistantMessage: 'No form in progress. Say which form you want to start (e.g. "Start occurrence report").',
          updatedDraft: {},
          missingRequiredFields: [],
          isComplete: false,
        };
      }
      const entities = payload.entities ?? {};
      const result = updateDraft(sessionId, entities);

      if (result.validationErrors.length > 0) {
        return {
          assistantMessage: `Please correct: ${result.validationErrors.join(' ')}`,
          updatedDraft: { ...result.draft },
          missingRequiredFields: [...result.missingRequiredFields],
          isComplete: result.missingRequiredFields.length === 0,
        };
      }

      if (result.missingRequiredFields.length === 0) {
        return {
          assistantMessage: `Form complete. Summary: ${formatDraftSummary(result.draft)}`,
          updatedDraft: { ...result.draft },
          missingRequiredFields: [],
          isComplete: true,
        };
      }

      const nextKey = result.missingRequiredFields[0];
      const nextLabel = getFieldLabel(result.formId, nextKey) ?? nextKey;
      return {
        assistantMessage: `Thanks. Next required field: ${nextLabel}.`,
        updatedDraft: { ...result.draft },
        missingRequiredFields: [...result.missingRequiredFields],
        isComplete: false,
      };
    }

    case 'show_summary': {
      const s = getSession(sessionId);
      if (!s) {
        return {
          assistantMessage: 'No form in progress. Start a form first.',
          updatedDraft: {},
          missingRequiredFields: [],
          isComplete: false,
        };
      }
      const summary = getSummary(sessionId);
      const msg = summary.isComplete
        ? `Summary: ${formatDraftSummary(summary.draft)}`
        : `Draft: ${formatDraftSummary(summary.draft)}. Still missing: ${summary.missingRequiredFields.join(', ')}.`;
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
          assistantMessage: 'No form in progress to submit.',
          updatedDraft: {},
          missingRequiredFields: [],
          isComplete: false,
        };
      }
      const complete = isComplete(sessionId);
      const summary = getSummary(sessionId);
      const msg = complete
        ? `Submitted. Summary: ${formatDraftSummary(summary.draft)}`
        : `Please fill required fields first: ${summary.missingRequiredFields.join(', ')}.`;
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
          ? 'You can start a form (e.g. "Start occurrence report"), fill fields by saying the values, ask for "summary", or "submit". I only use values you explicitly provide.'
          : 'You can say which field to change, or ask for "summary" to see the current draft.';
      return {
        assistantMessage: helpText,
        updatedDraft: draft,
        missingRequiredFields: missing,
        isComplete: missing.length === 0,
      };
    }
  }
}
