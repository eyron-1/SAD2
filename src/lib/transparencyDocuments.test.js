import test from 'node:test';
import assert from 'node:assert/strict';
import { getDocumentExtension, getDocumentFileError } from './transparencyDocuments.js';

test('accepts supported document formats and returns a lowercase extension', () => {
  const supportedFiles = [
    ['photo.jpg', 'image/jpeg'],
    ['photo.png', 'image/png'],
    ['photo.webp', 'image/webp'],
    ['record.pdf', 'application/pdf'],
    ['budget.xls', 'application/vnd.ms-excel'],
    ['budget.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['minutes.doc', 'application/msword'],
    ['minutes.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ];

  supportedFiles.forEach(([name, type]) => {
    const file = { name, type, size: 1024 };
    assert.equal(getDocumentFileError(file), '');
    assert.equal(getDocumentExtension(file), name.split('.').pop());
  });
});

test('rejects mismatched types, empty files, and files over the size limit', () => {
  assert.match(getDocumentFileError({ name: 'report.exe', type: 'application/pdf', size: 1024 }), /Use a JPG/);
  assert.match(getDocumentFileError({ name: 'report.pdf', type: 'application/pdf', size: 0 }), /smaller than 20 MB/);
  assert.match(getDocumentFileError({ name: 'report.pdf', type: 'application/pdf', size: 20 * 1024 * 1024 + 1 }), /smaller than 20 MB/);
  assert.equal(getDocumentFileError({ name: 'report.pdf', type: 'application/pdf', size: 20 * 1024 * 1024 }), '');
});
