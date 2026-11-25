

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const phpFmt = (v) => {
  const num = Number(v);
  if (!Number.isFinite(num)) return '—';
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const numFmt = (v) => {
  const num = Number(v);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('en-PH');
};

export function downloadWordDocument({
  filename = 'report.doc',
  title = 'OFFICIAL REPORT & ANALYTICS',
  organization = 'Barangay',
  lguDetails = {},
  period = 'All Fiscal Years',
  summary = '',
  summaryCards = [],
  tables = [],
  signatories = [],
}) {
  const generatedDate = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const provinceText = lguDetails.province
    ? `Province of ${lguDetails.province}`
    : 'Department of the Interior and Local Government';
  const municipalityText = lguDetails.municipality || 'Local Government Unit';
  const barangayText = `BARANGAY ${(lguDetails.barangay || organization || '').toUpperCase()}`;
  const officeText = lguDetails.office || 'OFFICE OF THE SANGGUNIANG BARANGAY';

  const defaultSignatories = signatories.length > 0 ? signatories : [
    { role: 'Prepared by:', name: 'BARANGAY TREASURER', title: 'Custodian of Public Funds' },
    { role: 'Certified Correct:', name: 'BARANGAY SECRETARY', title: 'Keeper of Official Records' },
    { role: 'Approved by:', name: 'PUNONG BARANGAY', title: 'Head of Local Government' },
  ];

  // Render KPI cards table
  let summaryHtml = '';
  if (summaryCards.length > 0) {
    const cardCells = summaryCards.map((card) => `
      <td class="kpi-cell" style="width: ${Math.floor(100 / summaryCards.length)}%;">
        <div class="kpi-label">${escapeHtml(card.label)}</div>
        <div class="kpi-value">${escapeHtml(card.value)}</div>
        ${card.sub ? `<div class="kpi-sub">${escapeHtml(card.sub)}</div>` : ''}
      </td>
    `).join('');

    summaryHtml = `
      <div class="section-title">EXECUTIVE SUMMARY</div>
      <table class="kpi-table" cellpadding="0" cellspacing="6">
        <tr>${cardCells}</tr>
      </table>
    `;
  }

  // Render data tables
  const tablesHtml = tables.map((tbl, tblIdx) => {
    const cols = tbl.columns || [];
    const rows = tbl.rows || [];

    // Calculate column totals
    const totals = {};
    let hasTotals = false;
    cols.forEach((col) => {
      if (col.format === 'currency' || col.format === 'number') {
        const sum = rows.reduce((acc, row) => {
          const val = Number(row[col.key]);
          return acc + (Number.isFinite(val) ? val : 0);
        }, 0);
        totals[col.key] = sum;
        hasTotals = true;
      }
    });

    const headerRow = cols.map((col) => {
      const align = col.align || (col.format === 'currency' || col.format === 'number' ? 'right' : 'left');
      return `<th style="text-align: ${align};">${escapeHtml(col.label)}</th>`;
    }).join('');

    const bodyRows = rows.length ? rows.map((row, rIdx) => {
      const isAlt = rIdx % 2 === 1;
      const cells = cols.map((col) => {
        const align = col.align || (col.format === 'currency' || col.format === 'number' ? 'right' : 'left');
        const raw = row[col.key];
        let displayVal = raw;

        if (col.render) {
          displayVal = col.render(raw, row);
        } else if (col.format === 'currency') {
          displayVal = raw != null && raw !== '' ? phpFmt(raw) : '—';
        } else if (col.format === 'number') {
          displayVal = raw != null && raw !== '' ? numFmt(raw) : '—';
        } else {
          displayVal = raw ?? '—';
        }

        return `<td style="text-align: ${align};">${escapeHtml(displayVal)}</td>`;
      }).join('');

      return `<tr class="${isAlt ? 'row-alt' : ''}"><td style="text-align: center; color: #64748b;">${rIdx + 1}</td>${cells}</tr>`;
    }).join('') : `<tr><td colspan="${cols.length + 1}" style="text-align: center; padding: 16pt; color: #64748b; font-style: italic;">${escapeHtml(tbl.emptyMessage || 'No records found for this period.')}</td></tr>`;

    let footerRow = '';
    if (hasTotals && rows.length > 0) {
      const totalCells = cols.slice(1).map((col) => {
        const align = col.align || (col.format === 'currency' || col.format === 'number' ? 'right' : 'left');
        let totalVal = '—';
        if (col.format === 'currency') totalVal = phpFmt(totals[col.key]);
        else if (col.format === 'number') totalVal = numFmt(totals[col.key]);
        return `<td style="text-align: ${align};">${escapeHtml(totalVal)}</td>`;
      }).join('');

      footerRow = `
        <tfoot>
          <tr class="total-row">
            <td colspan="2" style="text-align: left; font-weight: bold;">TOTAL</td>
            ${totalCells}
          </tr>
        </tfoot>
      `;
    }

    return `
      <div class="table-wrapper">
        <div class="section-title">
          <span>${escapeHtml(tbl.title)}</span>
          <span class="count-tag">(${rows.length} ${rows.length === 1 ? 'record' : 'records'})</span>
        </div>
        ${tbl.subtitle ? `<p class="table-subtitle">${escapeHtml(tbl.subtitle)}</p>` : ''}
        <table class="data-table" cellpadding="6" cellspacing="0">
          <thead>
            <tr>
              <th style="width: 28pt; text-align: center;">#</th>
              ${headerRow}
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
          ${footerRow}
        </table>
      </div>
    `;
  }).join('');

  // Signatory columns
  const sigCells = defaultSignatories.map((sig) => `
    <td class="sig-cell" style="width: ${Math.floor(100 / defaultSignatories.length)}%;">
      <div class="sig-role">${escapeHtml(sig.role)}</div>
      <div class="sig-space"></div>
      <div class="sig-name">${escapeHtml(sig.name)}</div>
      <div class="sig-title">${escapeHtml(sig.title)}</div>
    </td>
  `).join('');

  const wordDocumentHtml = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: 210mm 297mm;
      margin: 18mm 16mm 18mm 16mm;
      mso-header-margin: 10mm;
      mso-footer-margin: 10mm;
    }
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 10pt;
      color: #1e293b;
      line-height: 1.45;
      margin: 0;
      padding: 0;
    }
    .header-box {
      text-align: center;
      border-bottom: 2.5pt solid #0f2d4a;
      padding-bottom: 12pt;
      margin-bottom: 16pt;
    }
    .republic {
      font-size: 9pt;
      font-weight: bold;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1.5pt;
      margin: 0 0 2pt 0;
    }
    .province-city {
      font-size: 9.5pt;
      color: #334155;
      margin: 0 0 2pt 0;
    }
    .barangay-name {
      font-size: 13pt;
      font-weight: bold;
      color: #0f2d4a;
      letter-spacing: 0.5pt;
      margin: 2pt 0;
    }
    .office-title {
      font-size: 9pt;
      font-weight: bold;
      color: #2f6b4f;
      text-transform: uppercase;
      letter-spacing: 1pt;
      margin: 0;
    }
    .banner-title {
      background-color: #0f2d4a;
      color: #ffffff;
      padding: 10pt 16pt;
      text-align: center;
      margin: 14pt 0 6pt 0;
    }
    .banner-title h1 {
      font-size: 14pt;
      font-weight: bold;
      color: #ffffff;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    .meta-line {
      font-size: 9pt;
      color: #64748b;
      text-align: center;
      margin-bottom: 16pt;
      font-style: italic;
    }
    .section-title {
      font-size: 11.5pt;
      font-weight: bold;
      color: #0f2d4a;
      border-bottom: 1.5pt solid #2f6b4f;
      padding-bottom: 3pt;
      margin: 16pt 0 6pt 0;
      page-break-after: avoid;
    }
    .count-tag {
      font-size: 9pt;
      color: #64748b;
      font-weight: normal;
      margin-left: 6pt;
    }
    .table-subtitle {
      font-size: 9pt;
      color: #64748b;
      margin: 0 0 6pt 0;
      font-style: italic;
    }
    .kpi-table {
      width: 100%;
      margin-bottom: 16pt;
    }
    .kpi-cell {
      background-color: #f8fafc;
      border: 1pt solid #cbd5e1;
      padding: 8pt 10pt;
      text-align: center;
    }
    .kpi-label {
      font-size: 7.5pt;
      font-weight: bold;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin-bottom: 3pt;
    }
    .kpi-value {
      font-size: 12.5pt;
      font-weight: bold;
      color: #0f2d4a;
    }
    .kpi-sub {
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 2pt;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16pt;
      font-size: 8.5pt;
    }
    .data-table th {
      background-color: #0f2d4a;
      color: #ffffff;
      font-weight: bold;
      padding: 5pt 7pt;
      border: 0.5pt solid #0f2d4a;
    }
    .data-table td {
      padding: 4.5pt 7pt;
      border: 0.5pt solid #cbd5e1;
      vertical-align: top;
      color: #1e293b;
    }
    .data-table tr.row-alt td {
      background-color: #f8fafc;
    }
    .data-table tfoot tr.total-row td {
      background-color: #f1f5f9;
      font-weight: bold;
      color: #0f2d4a;
      border-top: 1.5pt solid #0f2d4a;
      border-bottom: 2.5pt double #0f2d4a;
    }
    .signatories-section {
      margin-top: 24pt;
      page-break-inside: avoid;
    }
    .sig-intro {
      font-size: 8.5pt;
      color: #475569;
      font-style: italic;
      margin-bottom: 14pt;
    }
    .sig-table {
      width: 100%;
      border-collapse: collapse;
    }
    .sig-cell {
      padding: 6pt 12pt;
      text-align: center;
      vertical-align: top;
    }
    .sig-role {
      font-size: 8.5pt;
      font-weight: bold;
      color: #475569;
      text-align: left;
    }
    .sig-space {
      height: 38pt;
    }
    .sig-name {
      font-size: 9.5pt;
      font-weight: bold;
      color: #0f2d4a;
      border-top: 1pt solid #334155;
      padding-top: 4pt;
    }
    .sig-title {
      font-size: 8pt;
      color: #64748b;
      margin-top: 1pt;
    }
    .doc-footer {
      border-top: 0.5pt solid #cbd5e1;
      margin-top: 24pt;
      padding-top: 6pt;
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <p class="republic">Republic of the Philippines</p>
    <p class="province-city">${escapeHtml(provinceText)} · ${escapeHtml(municipalityText)}</p>
    <p class="barangay-name">${escapeHtml(barangayText)}</p>
    <p class="office-title">${escapeHtml(officeText)}</p>
  </div>

  <div class="banner-title">
    <h1>${escapeHtml(title)}</h1>
  </div>

  <p class="meta-line">
    Coverage: ${escapeHtml(period)} &nbsp;|&nbsp; Generated on: ${escapeHtml(generatedDate)} &nbsp;|&nbsp; Certified Official Record
  </p>

  ${summaryHtml}

  ${tablesHtml}

  <div class="signatories-section">
    <p class="sig-intro">
      I hereby certify on official oath that the financial allocations, expenditures, fund sources, and project statuses presented above are derived directly from the verified records of ${escapeHtml(barangayText)}.
    </p>
    <table class="sig-table" cellpadding="0" cellspacing="0">
      <tr>${sigCells}</tr>
    </table>
  </div>

  <div class="doc-footer">
    Barangay Transparency &amp; Public Accountability System · Republic of the Philippines · Document Generated for Audit &amp; Public Transparency
  </div>
</body>
</html>
`;

  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const blob = new Blob(['\ufeff', wordDocumentHtml], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return wordDocumentHtml;
}
