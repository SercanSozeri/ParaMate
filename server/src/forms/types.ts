export type FormFieldType =
  | 'string'
  | 'number'
  | 'datetime'
  | 'select'
  | 'textarea'
  | 'array';

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
   validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface FormSection {
  title: string;
  fields: FormField[];
}

export type FormId =
  | 'OCCURRENCE_REPORT'
  | 'TEDDY_BEAR'
  | 'SHIFT_REPORT'
  | 'STATUS_REPORT';

export interface FormSchema {
  formId: FormId;
  id: string;
  title: string;
  sections: FormSection[];
  sequentialQuestionFlow?: boolean;
  conversationalMode?: boolean;
}

