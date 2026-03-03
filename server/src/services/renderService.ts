import { FormId, FORM_SCHEMA_BY_ID, isFormId } from '../forms';

const GOOD_VALUES = new Set(['available', 'good', 'ok', 'yes']);
const BAD_VALUES = new Set(['out of service', 'bad', 'no']);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

const baseStyles = `
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4; color: #222; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 16px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 14px; margin: 16px 0 8px; color: #444; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .cell-good { background: #d4edda; color: #155724; }
  .cell-bad { background: #ffe5d0; color: #843534; }
  .field-row { margin: 8px 0; }
  .field-label { font-weight: 600; color: #444; }
  .field-value { margin-top: 2px; }
`;

function wrapDocument(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${bodyContent}
</body>
</html>`;
}

/**
 * STATUS_REPORT: checklist table with GOOD (green) / BAD (orange) highlighting.
 */
function renderStatusReport(draft: Record<string, unknown>): string {
  const unitId = formatValue(draft.unitId);
  const status = formatValue(draft.status);
  const remarks = formatValue(draft.remarks);
  const statusLower = status.toLowerCase();
  const trClass = statusLower.includes('available') || GOOD_VALUES.has(statusLower)
    ? 'cell-good'
    : statusLower.includes('out of service') || BAD_VALUES.has(statusLower)
      ? 'cell-bad'
      : '';

  const rows = [
    { label: 'Unit ID', value: unitId, cellClass: '' },
    { label: 'Status', value: status, cellClass: trClass },
    { label: 'Remarks', value: remarks, cellClass: '' },
  ];

  const tds = rows
    .map(
      (r) =>
        `<tr><th>${escapeHtml(r.label)}</th><td class="${r.cellClass}">${escapeHtml(r.value)}</td></tr>`,
    )
    .join('');

  return `<table><tbody>${tds}</tbody></table>`;
}

/**
 * Generic form: sections and field list.
 */
function renderGenericForm(
  formId: FormId,
  draft: Record<string, unknown>,
): string {
  const schema = FORM_SCHEMA_BY_ID[formId];
  const parts: string[] = [];

  for (const section of schema.sections) {
    parts.push(`<h2>${escapeHtml(section.title)}</h2>`);
    for (const field of section.fields) {
      const value = formatValue(draft[field.key]);
      parts.push(
        `<div class="field-row"><div class="field-label">${escapeHtml(field.label)}</div><div class="field-value">${escapeHtml(value)}</div></div>`,
      );
    }
  }

  return parts.join('');
}

export function renderFormToHtml(
  formId: FormId,
  draft: Record<string, unknown>,
): string {
  const schema = FORM_SCHEMA_BY_ID[formId];
  const title = schema.title;

  const bodyContent =
    formId === 'STATUS_REPORT'
      ? renderStatusReport(draft)
      : renderGenericForm(formId, draft);

  return wrapDocument(title, bodyContent);
}

export function validateRenderRequest(
  formId: unknown,
  draft: unknown,
): { formId: FormId; draft: Record<string, unknown> } | { error: string } {
  if (!formId || !isFormId(String(formId))) {
    return { error: 'formId must be one of: OCCURRENCE_REPORT, TEDDY_BEAR, SHIFT_REPORT, STATUS_REPORT' };
  }
  if (draft !== undefined && draft !== null) {
    if (typeof draft !== 'object' || Array.isArray(draft)) {
      return { error: 'draft must be an object' };
    }
  }
  const draftObj = (draft && typeof draft === 'object' && !Array.isArray(draft))
    ? (draft as Record<string, unknown>)
    : {};
  return { formId: formId as FormId, draft: draftObj };
}

/** XML element names: letters, digits, underscore, hyphen only */
function safeElementName(key: string): string {
  return key.replace(/[^A-Za-z0-9_-]/g, '_');
}

function escapeXmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate Teddy Bear XML from draft keys.
 * Root: <TeddyBearTracking>, children: <key>value</key> per draft entry.
 */
export function generateTeddyBearXml(draft: Record<string, unknown>): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<TeddyBearTracking>'];
  for (const [key, value] of Object.entries(draft)) {
    const el = safeElementName(key);
    if (!el) continue;
    const text = escapeXmlText(formatValue(value));
    lines.push(`  <${el}>${text}</${el}>`);
  }
  lines.push('</TeddyBearTracking>');
  return lines.join('\n');
}
