import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrencyInput, finalizeCurrencyInput, parseCurrencyValue, validateCurrency } from './validation.js';
import { forecastAnnualSpend, sumAmounts, sumActiveAmounts } from './financial.js';

test('financial totals sum currency in integer cents', () => {
  assert.equal(sumAmounts([{ amount: 0.1 }, { amount: 0.2 }, { amount: '1.05' }]), 1.35);
  assert.equal(sumActiveAmounts([{ amount: 0.1 }, { amount: 0.2, status: 'voided' }]), 0.1);
  assert.equal(sumAmounts([{ amount: 'invalid' }]), 0);
});

test('annual spend forecast annualizes by elapsed months and rounds to cents', () => {
  assert.equal(forecastAnnualSpend(100, 2), 600);
  assert.equal(forecastAnnualSpend(10.01, 3), 40.04);
  assert.equal(forecastAnnualSpend(12, 0), 144);
});

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
