const downloadFile = (content, fileName, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  window.URL.revokeObjectURL(url);
};

const exportRowsToCsv = (rows, fileName) => {
  if (!rows.length) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? '').replaceAll('"', '""')}"`)
        .join(',')
    ),
  ];

  downloadFile(csvLines.join('\n'), fileName, 'text/csv;charset=utf-8;');
};

const printHtmlDocument = (title, html) => {
  const popup = window.open('', '_blank', 'width=960,height=720');

  if (!popup) {
    return;
  }

  popup.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Manrope, sans-serif; padding: 32px; color: #0f172a; }
          h1, h2 { margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 12px; text-align: left; }
          .meta { color: #64748b; margin-bottom: 24px; }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
};

export { exportRowsToCsv, printHtmlDocument };
