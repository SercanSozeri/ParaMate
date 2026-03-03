export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'select'
  | 'checkbox';

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
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
  title: string;
  sections: FormSection[];
}

