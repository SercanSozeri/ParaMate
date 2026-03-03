import {
  FormField,
  FormId,
  FormSchema,
  FORM_SCHEMA_BY_ID,
} from '../forms';

export interface FormSessionState {
  formId: FormId;
  draft: Record<string, unknown>;
  missingRequiredFields: string[];
}

export interface FormSummary {
  formId: FormId;
  draft: Record<string, unknown>;
  missingRequiredFields: string[];
  isComplete: boolean;
}

export interface UpdateDraftResult extends FormSessionState {
  validationErrors: string[];
}

const sessions = new Map<string, FormSessionState>();

const getSchema = (formId: FormId): FormSchema => {
  const schema = FORM_SCHEMA_BY_ID[formId];
  if (!schema) {
    throw new Error(`Unknown formId: ${formId}`);
  }
  return schema;
};

const getRequiredFieldKeys = (schema: FormSchema): string[] => {
  return schema.sections.flatMap((section) =>
    section.fields
      .filter((field) => field.required)
      .map((field) => field.key),
  );
};

const buildFieldMap = (schema: FormSchema): Record<string, FormField> => {
  const map: Record<string, FormField> = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      map[field.key] = field;
    }
  }
  return map;
};

const computeMissingRequiredFields = (
  schema: FormSchema,
  draft: Record<string, unknown>,
): string[] => {
  const requiredKeys = getRequiredFieldKeys(schema);
  return requiredKeys.filter((key) => {
    const value = draft[key];
    if (value === undefined || value === null) {
      return true;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return true;
    }
    return false;
  });
};

export const startForm = (
  sessionId: string,
  formId: FormId,
): FormSessionState => {
  const schema = getSchema(formId);
  const draft: Record<string, unknown> = {};
  const missingRequiredFields = getRequiredFieldKeys(schema);

  const state: FormSessionState = {
    formId,
    draft,
    missingRequiredFields,
  };

  sessions.set(sessionId, state);
  return state;
};

export const updateDraft = (
  sessionId: string,
  newFields: Record<string, unknown>,
): UpdateDraftResult => {
  const state = sessions.get(sessionId);
  if (!state) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const schema = getSchema(state.formId);
  const fieldMap = buildFieldMap(schema);

  const validationErrors: string[] = [];

  for (const [key, rawValue] of Object.entries(newFields)) {
    const field = fieldMap[key];
    if (!field) {
      // Unknown field key – ignore it.
      continue;
    }

    const value = rawValue as unknown;

    switch (field.type) {
      case 'number': {
        let numeric: number | undefined;
        if (typeof value === 'number') {
          numeric = value;
        } else if (typeof value === 'string' && value.trim() !== '') {
          const parsed = Number(value);
          if (!Number.isNaN(parsed)) {
            numeric = parsed;
          }
        }
        if (numeric === undefined) {
          validationErrors.push(
            `Field "${key}" must be a valid number.`,
          );
          continue;
        }
        state.draft[key] = numeric;
        break;
      }
      case 'select': {
        if (typeof value !== 'string') {
          validationErrors.push(
            `Field "${key}" must be a string matching one of the allowed options.`,
          );
          continue;
        }
        if (!field.options || !field.options.includes(value)) {
          validationErrors.push(
            `Field "${key}" must be one of: ${field.options?.join(', ') ?? ''}`,
          );
          continue;
        }
        state.draft[key] = value;
        break;
      }
      case 'checkbox': {
        if (typeof value === 'boolean') {
          state.draft[key] = value;
        } else if (typeof value === 'string') {
          const lowered = value.toLowerCase();
          if (lowered === 'true' || lowered === '1') {
            state.draft[key] = true;
          } else if (lowered === 'false' || lowered === '0') {
            state.draft[key] = false;
          } else {
            validationErrors.push(
              `Field "${key}" must be a boolean-compatible value.`,
            );
            continue;
          }
        } else if (typeof value === 'number') {
          if (value === 1) {
            state.draft[key] = true;
          } else if (value === 0) {
            state.draft[key] = false;
          } else {
            validationErrors.push(
              `Field "${key}" must be a boolean-compatible value.`,
            );
            continue;
          }
        } else {
          validationErrors.push(
            `Field "${key}" must be a boolean-compatible value.`,
          );
          continue;
        }
        break;
      }
      case 'text':
      case 'textarea':
      case 'date':
      case 'time': {
        // For these simple types we accept any non-nullish value and coerce to string.
        if (value === undefined || value === null) {
          state.draft[key] = value;
        } else {
          state.draft[key] = String(value);
        }
        break;
      }
      default: {
        // Exhaustiveness guard – should never happen if FormFieldType is kept in sync.
        validationErrors.push(`Unsupported field type for "${key}".`);
        break;
      }
    }
  }

  state.missingRequiredFields = computeMissingRequiredFields(schema, state.draft);
  sessions.set(sessionId, state);

  return {
    ...state,
    validationErrors,
  };
};

export const getSession = (sessionId: string): FormSessionState | undefined => {
  const state = sessions.get(sessionId);
  if (!state) return undefined;
  return {
    formId: state.formId,
    draft: { ...state.draft },
    missingRequiredFields: [...state.missingRequiredFields],
  };
};

export const getNextMissingField = (sessionId: string): string | undefined => {
  const state = sessions.get(sessionId);
  if (!state) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  return state.missingRequiredFields[0];
};

export const isComplete = (sessionId: string): boolean => {
  const state = sessions.get(sessionId);
  if (!state) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  return state.missingRequiredFields.length === 0;
};

export const getSummary = (sessionId: string): FormSummary => {
  const state = sessions.get(sessionId);
  if (!state) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  return {
    formId: state.formId,
    draft: { ...state.draft },
    missingRequiredFields: [...state.missingRequiredFields],
    isComplete: state.missingRequiredFields.length === 0,
  };
};

