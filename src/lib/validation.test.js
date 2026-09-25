import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrencyInput, parseCurrencyValue } from './validation.js';

test('formatCurrencyInput adds commas and keeps decimal precision', () => {
  assert.equal(formatCurrencyInput('1234'), '1,234');
  assert.equal(formatCurrencyInput('1234567.89'), '1,234,567.89');
  assert.equal(formatCurrencyInput('1234.5'), '1,234.5');
  assert.equal(formatCurrencyInput('₱1234567.89'), '1,234,567.89');
});

test('parseCurrencyValue strips formatting and returns a numeric value', () => {
  assert.equal(parseCurrencyValue('1,234.50'), 1234.5);
  assert.equal(parseCurrencyValue('₱12,000'), 12000);
  assert.equal(parseCurrencyValue(''), 0);
});
