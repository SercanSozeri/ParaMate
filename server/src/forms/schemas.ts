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
  id: 'occurrence_report',
  title: 'Occurrence Report',
  sequentialQuestionFlow: true,
  sections: [
    {
      title: 'Incident Overview',
      fields: [
        {
          key: 'incidentDate',
          label: 'Incident Date',
          type: 'string',
          required: true,
        },
        {
          key: 'incidentTime',
          label: 'Incident Time',
          type: 'string',
          required: true,
        },
        {
          key: 'callNumber',
          label: 'Call Number',
          type: 'string',
          required: false,
        },
        {
          key: 'occurrenceType',
          label: 'Occurrence Type',
          type: 'string',
          required: true,
        },
        {
          key: 'occurrenceReference',
          label: 'Occurrence Reference',
          type: 'string',
          required: false,
        },
        {
          key: 'briefDescription',
          label: 'Brief Description',
          type: 'textarea',
          required: true,
        },
      ],
    },
    {
      title: 'Classification',
      fields: [
        {
          key: 'classification',
          label: 'Classification',
          type: 'string',
          required: true,
        },
        {
          key: 'classificationDetails',
          label: 'Classification Details',
          type: 'textarea',
          required: false,
        },
      ],
    },
    {
      title: 'Service & Vehicle',
      fields: [
        {
          key: 'service',
          label: 'Service',
          type: 'string',
          required: true,
        },
        {
          key: 'vehicleNumber',
          label: 'Vehicle Number',
          type: 'string',
          required: true,
        },
        {
          key: 'vehicleDescription',
          label: 'Vehicle Description',
          type: 'textarea',
          required: false,
        },
      ],
    },
    {
      title: 'Personnel',
      fields: [
        {
          key: 'role',
          label: 'Role',
          type: 'string',
          required: true,
        },
        {
          key: 'roleDescription',
          label: 'Role Description',
          type: 'textarea',
          required: false,
        },
        {
          key: 'badgeNumber',
          label: 'Badge Number',
          type: 'string',
          required: true,
        },
        {
          key: 'otherServicesInvolved',
          label: 'Other Services Involved',
          type: 'array',
          required: false,
          options: ['fire', 'police'],
        },
      ],
    },
    {
      title: 'Report Details',
      fields: [
        {
          key: 'observationDetails',
          label: 'Observation Details',
          type: 'textarea',
          required: true,
        },
        {
          key: 'actionTaken',
          label: 'Action Taken',
          type: 'textarea',
          required: true,
        },
        {
          key: 'suggestedResolution',
          label: 'Suggested Resolution',
          type: 'textarea',
          required: false,
        },
        {
          key: 'managementNotes',
          label: 'Management Notes',
          type: 'textarea',
          required: false,
        },
      ],
    },
    {
      title: 'Submission Information',
      fields: [
        {
          key: 'requestedBy',
          label: 'Requested By',
          type: 'string',
          required: true,
        },
        {
          key: 'requestedByDetails',
          label: 'Requested By Details',
          type: 'textarea',
          required: false,
        },
        {
          key: 'reportCreator',
          label: 'Report Creator',
          type: 'string',
          required: true,
        },
        {
          key: 'creatorDetails',
          label: 'Creator Details',
          type: 'textarea',
          required: false,
        },
      ],
    },
  ],
};

export const TEDDY_BEAR_FORM: FormSchema = {
  formId: 'TEDDY_BEAR',
  id: 'teddy_bear_tracking',
  title: 'Teddy Bear Tracking',
  sequentialQuestionFlow: true,
  sections: [
    {
      title: 'Date & Time',
      fields: [
        {
          key: 'distributionDateTime',
          label: 'Distribution Date & Time',
          type: 'datetime',
          required: true,
        },
      ],
    },
    {
      title: 'Primary Medic',
      fields: [
        {
          key: 'primaryFirstName',
          label: 'Primary Medic First Name',
          type: 'string',
          required: true,
        },
        {
          key: 'primaryLastName',
          label: 'Primary Medic Last Name',
          type: 'string',
          required: true,
        },
        {
          key: 'primaryMedicNumber',
          label: 'Primary Medic Number',
          type: 'string',
          required: true,
        },
      ],
    },
    {
      title: 'Secondary Medic (Optional)',
      fields: [
        {
          key: 'secondaryFirstName',
          label: 'Secondary Medic First Name',
          type: 'string',
          required: false,
        },
        {
          key: 'secondaryLastName',
          label: 'Secondary Medic Last Name',
          type: 'string',
          required: false,
        },
        {
          key: 'secondaryMedicNumber',
          label: 'Secondary Medic Number',
          type: 'string',
          required: false,
        },
      ],
    },
    {
      title: 'Recipient',
      fields: [
        {
          key: 'recipientAge',
          label: 'Recipient Age',
          type: 'number',
          required: true,
          validation: {
            min: 0,
            max: 120,
          },
        },
        {
          key: 'recipientGender',
          label: 'Recipient Gender',
          type: 'string',
          required: true,
        },
        {
          key: 'recipientType',
          label: 'Recipient Type',
          type: 'string',
          required: true,
        },
      ],
    },
  ],
};

export const SHIFT_REPORT_FORM: FormSchema = {
  formId: 'SHIFT_REPORT',
  id: 'shift_report',
  title: 'Shift Report',
  conversationalMode: true,
  sections: [
    {
      title: 'Shift Conversation Context',
      fields: [
        {
          key: 'month',
          label: 'Month',
          type: 'string',
          required: false,
        },
        {
          key: 'week',
          label: 'Week',
          type: 'string',
          required: false,
        },
        {
          key: 'shiftType',
          label: 'Shift Type',
          type: 'string',
          required: false,
        },
        {
          key: 'date',
          label: 'Date',
          type: 'string',
          required: false,
        },
      ],
    },
  ],
};

export const STATUS_REPORT_FORM: FormSchema = {
  formId: 'STATUS_REPORT',
  id: 'status_report',
  title: 'Status Report',
  sequentialQuestionFlow: true,
  sections: [
    {
      title: 'Crew & Unit Status',
      fields: [
        {
          key: 'unitId',
          label: 'Unit ID',
          type: 'string',
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

