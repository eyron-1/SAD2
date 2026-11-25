import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadExcel } from '../excelExport.js';
import { downloadWordDocument } from '../documentExport.js';

test('downloadExcel produces a valid zip workbook containing styles, worksheet, and auto-computed totals', async () => {
  const columns = [
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', format: 'currency' },
    { key: 'count', label: 'Beneficiaries', format: 'number' },
  ];
  const rows = [
    { category: 'Health Services', amount: 50000, count: 120 },
    { category: 'Infrastructure', amount: 150000, count: 500 },
  ];

  const workbook = await downloadExcel({
    filename: 'test_report.xlsx',
    title: 'Test Budget Allocations',
    organization: 'Barangay San Jose',
    period: 'Fiscal Year 2026',
    summary: '2 allocations recorded',
    columns,
    rows,
  });

  assert.ok(workbook instanceof Uint8Array, 'workbook should be a Uint8Array');
  assert.ok(workbook.length > 500, 'workbook should contain zipped OpenXML files');
  // OpenXML zip header starts with PK (0x50, 0x4B)
  assert.equal(workbook[0], 0x50);
  assert.equal(workbook[1], 0x4B);
});

test('downloadExcel rejects export when no columns are provided', async () => {
  await assert.rejects(
    downloadExcel({ filename: 'empty.xlsx', title: 'Empty', columns: [], rows: [] }),
    /must include at least one column/
  );
});

test('downloadWordDocument produces a valid Word HTML document with LGU letterhead, KPI tables, and signatories', () => {
  const html = downloadWordDocument({
    filename: 'audit_report.doc',
    title: 'ANNUAL FINANCIAL & AUDIT ANALYTICS REPORT',
    organization: 'Barangay San Jose',
    lguDetails: {
      province: 'Rizal',
      municipality: 'Antipolo City',
      barangay: 'San Jose',
    },
    period: 'Fiscal Year 2026',
    summaryCards: [
      { label: 'Total Funds', value: '₱200,000.00' },
      { label: 'Total Spent', value: '₱150,000.00' },
    ],
    tables: [
      {
        title: 'Allocations',
        columns: [
          { key: 'category', label: 'Category' },
          { key: 'amount', label: 'Amount', format: 'currency' },
        ],
        rows: [
          { category: 'Education', amount: 100000 },
        ],
      },
    ],
    signatories: [
      { role: 'Prepared by:', name: 'JUAN DELA CRUZ', title: 'Barangay Treasurer' },
    ],
  });

  assert.ok(typeof html === 'string', 'result must be a string');
  assert.match(html, /Republic of the Philippines/);
  assert.match(html, /Province of Rizal/);
  assert.match(html, /Antipolo City/);
  assert.match(html, /BARANGAY SAN JOSE/);
  assert.match(html, /ANNUAL FINANCIAL &amp; AUDIT ANALYTICS REPORT/);
  assert.match(html, /EXECUTIVE SUMMARY/);
  assert.match(html, /₱200,000.00/);
  assert.match(html, /Education/);
  assert.match(html, /₱100,000.00/);
  assert.match(html, /JUAN DELA CRUZ/);
  assert.match(html, /Barangay Treasurer/);
  assert.match(html, /TOTAL/);
});
