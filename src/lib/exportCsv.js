const COLUMNS = ['Score', 'Business', 'Type', 'Address', 'Phone', 'Email', 'Website', 'AI Reason', 'AI Detail'];

function escapeCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportProspectsCsv(prospects, filename = 'prospects.csv') {
  const rows = prospects.map((p) => [
    p.ai_score ?? '',
    p.name ?? '',
    p.facility_type ?? '',
    p.address ?? '',
    p.phone ?? '',
    p.email ?? '',
    p.website ?? '',
    p.ai_reason ?? '',
    p.ai_detail ?? '',
  ]);

  const csv = [COLUMNS, ...rows]
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n');

  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
