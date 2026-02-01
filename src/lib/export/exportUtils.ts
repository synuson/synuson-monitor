// CSV Export
export function exportToCSV(data: Record<string, unknown>[], filename: string, headers?: string[]) {
  if (data.length === 0) return;

  const keys = headers || Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(keys.join(','));

  // Data rows
  for (const row of data) {
    const values = keys.map((key) => {
      const value = row[key];
      // Escape quotes and wrap in quotes if contains comma or newline
      const escaped = String(value ?? '').replace(/"/g, '""');
      return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  downloadFile(csvString, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// Excel Export (using simple HTML table format that Excel can open)
export function exportToExcel(data: Record<string, unknown>[], filename: string, headers?: string[]) {
  if (data.length === 0) return;

  const keys = headers || Object.keys(data[0]);

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head>
      <meta charset="UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Sheet1</x:Name>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 8px; }
        th { background-color: #4472C4; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #D9E1F2; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            ${keys.map((key) => `<th>${escapeHtml(key)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  for (const row of data) {
    html += '<tr>';
    for (const key of keys) {
      html += `<td>${escapeHtml(String(row[key] ?? ''))}</td>`;
    }
    html += '</tr>';
  }

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  downloadFile(html, `${filename}.xls`, 'application/vnd.ms-excel');
}

// JSON Export
export function exportToJSON(data: unknown, filename: string) {
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, `${filename}.json`, 'application/json');
}

// Helper function to download file
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Format data for export
export function formatHostsForExport(hosts: { hostid: string; host: string; name: string; status: string; available: string }[]) {
  return hosts.map((h) => ({
    ID: h.hostid,
    Host: h.host,
    Name: h.name,
    Status: h.status === '0' ? 'Enabled' : 'Disabled',
    Available: h.available === '1' ? 'Online' : 'Offline',
  }));
}

export function formatProblemsForExport(problems: { eventid: string; name: string; severity: string; clock: string; acknowledged: string }[]) {
  const severityLabels: Record<string, string> = {
    '5': 'Disaster',
    '4': 'High',
    '3': 'Average',
    '2': 'Warning',
    '1': 'Information',
    '0': 'Not classified',
  };

  return problems.map((p) => ({
    EventID: p.eventid,
    Problem: p.name,
    Severity: severityLabels[p.severity] || 'Unknown',
    Time: new Date(parseInt(p.clock) * 1000).toLocaleString('ko-KR'),
    Acknowledged: p.acknowledged === '1' ? 'Yes' : 'No',
  }));
}

export function formatEventsForExport(events: { eventid: string; clock: string; name: string; severity: string; value: string }[]) {
  const severityLabels: Record<string, string> = {
    '5': 'Disaster',
    '4': 'High',
    '3': 'Average',
    '2': 'Warning',
    '1': 'Information',
    '0': 'Not classified',
  };

  return events.map((e) => ({
    EventID: e.eventid,
    Time: new Date(parseInt(e.clock) * 1000).toLocaleString('ko-KR'),
    Event: e.name,
    Severity: severityLabels[e.severity] || 'Unknown',
    Status: e.value === '1' ? 'PROBLEM' : 'OK',
  }));
}
