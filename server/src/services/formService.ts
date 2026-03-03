import {
  FormId,
  FormSchema,
  FORM_SCHEMAS,
  FORM_SCHEMA_BY_ID,
  isFormId,
} from '../forms';

export interface FormMetadata {
  formId: FormId;
  title: string;
}

export interface FormsListResponse {
  metadata: FormMetadata[];
  forms: FormSchema[];
}

export interface SingleFormResponse {
  metadata: FormMetadata;
  schema: FormSchema;
}

export const listForms = (): FormsListResponse => {
  const metadata: FormMetadata[] = FORM_SCHEMAS.map(({ formId, title }) => ({
    formId,
    title,
  }));

  return {
    metadata,
    forms: [...FORM_SCHEMAS],
  };
};

export const getFormById = (id: string): SingleFormResponse | undefined => {
  if (!isFormId(id)) {
    return undefined;
  }

  const schema = FORM_SCHEMA_BY_ID[id];

  if (!schema) {
    return undefined;
  }

  const metadata: FormMetadata = {
    formId: schema.formId,
    title: schema.title,
  };

  return { metadata, schema };
};

