import { FormSchema, FormId } from './types';

export const FORM_IDS: readonly FormId[] = [
  'OCCURRENCE_REPORT',
  'TEDDY_BEAR',
  'SHIFT_REPORT',
  'STATUS_REPORT',
] as const;

export const isFormId = (value: string): value is FormId => {
  return (FORM_IDS as readonly string[]).includes(value);
};

export const OCCURRENCE_REPORT_FORM: FormSchema = {
  formId: 'OCCURRENCE_REPORT',
  title: 'Occurrence Report',
  sections: [
    {
      title: 'Incident Details',
      fields: [
        {
          key: 'incidentDate',
          label: 'Incident Date',
          type: 'date',
          required: true,
        },
        {
          key: 'incidentTime',
          label: 'Incident Time',
          type: 'time',
          required: true,
        },
        {
          key: 'location',
          label: 'Location',
          type: 'text',
          required: true,
          placeholder: 'Street address or description',
        },
        {
          key: 'description',
          label: 'Brief Description',
          type: 'textarea',
          required: true,
          placeholder: 'Summarize what happened',
        },
      ],
    },
  ],
};

export const TEDDY_BEAR_FORM: FormSchema = {
  formId: 'TEDDY_BEAR',
  title: 'Teddy Bear Intervention',
  sections: [
    {
      title: 'Child & Context',
      fields: [
        {
          key: 'childAge',
          label: 'Child Age',
          type: 'number',
          required: false,
          placeholder: 'Age in years',
        },
        {
          key: 'situation',
          label: 'Situation',
          type: 'select',
          required: true,
          options: [
            'Trauma',
            'Medical',
            'Emotional support',
            'Family crisis',
          ],
        },
        {
          key: 'bearGiven',
          label: 'Bear Given',
          type: 'checkbox',
          required: false,
        },
        {
          key: 'notes',
          label: 'Notes',
          type: 'textarea',
          required: false,
          placeholder: 'Short note about the interaction',
        },
      ],
    },
  ],
};

export const SHIFT_REPORT_FORM: FormSchema = {
  formId: 'SHIFT_REPORT',
  title: 'Shift Report',
  sections: [
    {
      title: 'Shift Summary',
      fields: [
        {
          key: 'shiftDate',
          label: 'Shift Date',
          type: 'date',
          required: true,
        },
        {
          key: 'shiftType',
          label: 'Shift Type',
          type: 'select',
          required: true,
          options: ['Day', 'Evening', 'Night'],
        },
        {
          key: 'callsAttended',
          label: 'Number of Calls',
          type: 'number',
          required: false,
        },
        {
          key: 'highlights',
          label: 'Highlights / Concerns',
          type: 'textarea',
          required: false,
          placeholder: 'Anything notable from the shift',
        },
      ],
    },
  ],
};

export const STATUS_REPORT_FORM: FormSchema = {
  formId: 'STATUS_REPORT',
  title: 'Status Report',
  sections: [
    {
      title: 'Crew & Unit Status',
      fields: [
        {
          key: 'unitId',
          label: 'Unit ID',
          type: 'text',
          required: true,
        },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          options: ['Available', 'On scene', 'Transporting', 'Out of service'],
        },
        {
          key: 'remarks',
          label: 'Remarks',
          type: 'textarea',
          required: false,
        },
      ],
    },
  ],
};

export const FORM_SCHEMAS: readonly FormSchema[] = [
  OCCURRENCE_REPORT_FORM,
  TEDDY_BEAR_FORM,
  SHIFT_REPORT_FORM,
  STATUS_REPORT_FORM,
] as const;

export const FORM_SCHEMA_BY_ID: Record<FormId, FormSchema> = FORM_SCHEMAS.reduce(
  (acc, schema) => {
    acc[schema.formId] = schema;
    return acc;
  },
  {} as Record<FormId, FormSchema>,
);

