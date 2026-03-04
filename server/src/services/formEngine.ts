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
    if (Array.isArray(value) && value.length === 0) {
      return true;
    }
    return false;
  });
};

/**
 * Conversational validation: polite, clear, supportive. No robotic phrasing.
 */
const buildVoiceValidationMessage = (
  formatExplanation: string,
  example: string,
  _label: string,
): string =>
  `I'm sorry, ${formatExplanation} For example: ${example}. Could you repeat that please?`;

const validateFieldValue = (
  field: FormField,
  value: unknown,
): string | undefined => {
  const label = field.label;
  const key = field.key.toLowerCase();
  const stringValue =
    typeof value === 'string' ? value.trim() : String(value ?? '').trim();

  // Empty values are handled by required-field logic; not a format error.
  if (!stringValue) {
    return undefined;
  }

  // Date: YYYY-MM-DD
  if (key === 'incidentdate') {
    const timestamp = Date.parse(stringValue);
    if (Number.isNaN(timestamp)) {
      return buildVoiceValidationMessage(
        'I need the date in this format: YYYY-MM-DD.',
        '2026-03-03',
        label,
      );
    }
  }

  // Time: 24h HH:MM
  if (key === 'incidenttime') {
    const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(stringValue)) {
      return buildVoiceValidationMessage(
        'I need the time in 24-hour format, like HH:MM.',
        '14:30',
        label,
      );
    }
  }

  // Badge: alphanumeric
  if (key === 'badgenumber') {
    const badgeRegex = /^[a-z0-9]+$/i;
    if (!badgeRegex.test(stringValue)) {
      return buildVoiceValidationMessage(
        'I need a badge number with letters and numbers only.',
        'B12345',
        label,
      );
    }
  }

  // Medic ID: numeric only
  if (
    key === 'medicnumber' ||
    key === 'primarymedicnumber' ||
    key === 'secondarymedicnumber'
  ) {
    const medicRegex = /^\d+$/;
    if (!medicRegex.test(stringValue)) {
      return buildVoiceValidationMessage(
        'I need the medic ID as a number.',
        '10452',
        label,
      );
    }
  }

  // Age: number 0–120
  if (key === 'recipientage') {
    const num =
      typeof value === 'number' ? value : Number.parseInt(stringValue, 10);
    if (Number.isNaN(num) || num < 0 || num > 120) {
      return buildVoiceValidationMessage(
        'I need age as a number between 0 and 120.',
        '6',
        label,
      );
    }
  }

  // Email
  if (key.includes('email')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(stringValue)) {
      return buildVoiceValidationMessage(
        'I need a valid email address.',
        'name@example.com',
        label,
      );
    }
  }

  // Phone
  if (key.includes('phone') || key.includes('tel')) {
    const phoneRegex = /^[+\d][\d\s\-().]{5,}$/;
    if (!phoneRegex.test(stringValue)) {
      return buildVoiceValidationMessage(
        'I need a valid phone number.',
        '555-123-4567',
        label,
      );
    }
  }

  // Schema-driven numeric range
  if (
    typeof value === 'number' &&
    field.validation &&
    (field.validation.min !== undefined || field.validation.max !== undefined)
  ) {
    const { min, max } = field.validation;
    if (min !== undefined && value < min) {
      return buildVoiceValidationMessage(
        `I need a number no less than ${min}.`,
        String(min),
        label,
      );
    }
    if (max !== undefined && value > max) {
      return buildVoiceValidationMessage(
        `I need a number no greater than ${max}.`,
        String(max),
        label,
      );
    }
  }

  // Schema-driven pattern (generic)
  if (field.validation?.pattern) {
    try {
      const re = new RegExp(field.validation.pattern);
      if (!re.test(stringValue)) {
        return `I'm sorry, I need ${label.toLowerCase()} in the correct format. Could you repeat that please?`;
      }
    } catch {
      // Invalid regex in schema – ignore pattern.
    }
  }

  return undefined;
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
            buildVoiceValidationMessage(
              `I need a valid number for ${field.label.toLowerCase()}.`,
              '42',
              field.label,
            ),
          );
          continue;
        }
        const error = validateFieldValue(field, numeric);
        if (error) {
          validationErrors.push(error);
          continue;
        }
        state.draft[key] = numeric;
        break;
      }
      case 'select': {
        if (typeof value !== 'string') {
          const opts = field.options ?? [];
          const example = opts[0] ?? 'one of the options';
          validationErrors.push(
            `I'm sorry, I need one of: ${opts.join(', ')}. For example: ${example}. Could you repeat that please?`,
          );
          continue;
        }
        if (!field.options || !field.options.includes(value)) {
          const opts = field.options ?? [];
          const example = opts[0] ?? 'one of the options';
          validationErrors.push(
            `I'm sorry, I need one of: ${opts.join(', ')}. For example: ${example}. Could you repeat that please?`,
          );
          continue;
        }
        {
          const error = validateFieldValue(field, value);
          if (error) {
            validationErrors.push(error);
            continue;
          }
        }
        state.draft[key] = value;
        break;
      }
      case 'array': {
        if (Array.isArray(value)) {
          state.draft[key] = value;
        } else if (typeof value === 'string') {
          const items = value
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v.length > 0);
          state.draft[key] = items;
        } else {
          validationErrors.push(
            `I'm sorry, I need a list of values or comma-separated. For example: item1, item2. Could you repeat that please?`,
          );
          continue;
        }
        break;
      }
      case 'string':
      case 'textarea':
      case 'datetime': {
        // For these simple types we accept any non-nullish value and coerce to string.
        if (value === undefined || value === null) {
          state.draft[key] = value;
        } else {
          const str = String(value);
          const error = validateFieldValue(field, str);
          if (error) {
            validationErrors.push(error);
            continue;
          }
          state.draft[key] = str;
        }
        break;
      }
      default: {
        validationErrors.push(
          `I'm sorry, I need a value in the correct format for ${field.label.toLowerCase()}. Could you repeat that please?`,
        );
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

