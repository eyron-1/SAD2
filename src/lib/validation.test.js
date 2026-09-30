import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrencyInput, finalizeCurrencyInput, parseCurrencyValue, validateCurrency } from './validation.js';

test('formatCurrencyInput adds commas and keeps decimal precision', () => {
  assert.equal(formatCurrencyInput('1234'), '1,234');
  assert.equal(formatCurrencyInput('1234567.89'), '1,234,567.89');
  assert.equal(formatCurrencyInput('1234.5'), '1,234.5');
  assert.equal(formatCurrencyInput('₱1234567.89'), '1,234,567.89');
});

test('finalizeCurrencyInput automatically appends .00 and rounds to 2 decimals', () => {
  assert.equal(finalizeCurrencyInput('1000'), '1,000.00');
  assert.equal(finalizeCurrencyInput('1000.5'), '1,000.50');
  assert.equal(finalizeCurrencyInput('1,000.50'), '1,000.50');
  assert.equal(finalizeCurrencyInput(''), '');
  assert.equal(finalizeCurrencyInput(null), '');
});

test('parseCurrencyValue strips formatting and returns a numeric value', () => {
  assert.equal(parseCurrencyValue('1,234.50'), 1234.5);
  assert.equal(parseCurrencyValue('₱12,000'), 12000);
  assert.equal(parseCurrencyValue(''), 0);
  assert.equal(parseCurrencyValue(null), 0);
});

test('validateCurrency validates formats and rejects negatives or non-numbers', () => {
  assert.equal(validateCurrency('1,000.00'), '');
  assert.equal(validateCurrency('₱ 1,000.00'), '');
  assert.equal(validateCurrency('500'), '');
  assert.notEqual(validateCurrency('abc'), '');
  assert.notEqual(validateCurrency('-50'), '');
});
