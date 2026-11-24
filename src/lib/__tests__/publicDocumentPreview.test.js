import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPublicDocumentDownloadUrl,
  getPublicDocumentFileName,
  getPublicDocumentPreviewType,
} from '../publicDocumentPreview.js';

test('identifies image and PDF previews from document metadata or receipt URLs', () => {
  assert.equal(getPublicDocumentPreviewType({ mime_type: 'image/png' }, ''), 'image');
  assert.equal(getPublicDocumentPreviewType({}, 'https://storage.example/receipts/proof.jpg'), 'image');
  assert.equal(getPublicDocumentPreviewType({ file_name: 'budget.pdf' }, ''), 'pdf');
  assert.equal(getPublicDocumentPreviewType({ file_name: 'report.docx' }, ''), 'unsupported');
});

test('creates a save URL with the requested filename', () => {
  const downloadUrl = getPublicDocumentDownloadUrl(
    'https://storage.example/documents/proof.png?token=abc',
    'proof copy.png',
  );
  const parsedUrl = new URL(downloadUrl);
  assert.equal(parsedUrl.searchParams.get('download'), 'proof copy.png');
  assert.equal(parsedUrl.searchParams.get('token'), 'abc');
  assert.equal(getPublicDocumentFileName({}, 'https://storage.example/proofs/proof.png'), 'proof.png');
});
