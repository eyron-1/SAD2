import test from 'node:test';
import assert from 'node:assert/strict';
import { getDateBasedProgramStatus, getPhilippineDateString } from './programStatus.js';

test('planned programs become ongoing on their start date', () => {
  assert.equal(
    getDateBasedProgramStatus(
      { status: 'planned', start_date: '2026-10-17', end_date: '2026-10-20' },
      '2026-10-17',
    ),
    'ongoing',
  );
});

test('planned and ongoing programs become completed on their end date', () => {
  const today = '2026-10-20';
  assert.equal(
    getDateBasedProgramStatus(
      { status: 'planned', start_date: '2026-10-17', end_date: today },
      today,
    ),
    'completed',
  );
  assert.equal(
    getDateBasedProgramStatus(
      { status: 'ongoing', start_date: '2026-10-17', end_date: today },
      today,
    ),
    'completed',
  );
});

test('date status changes do not override completed or cancelled programs', () => {
  assert.equal(
    getDateBasedProgramStatus(
      { status: 'cancelled', start_date: '2026-10-01', end_date: '2026-10-10' },
      '2026-10-20',
    ),
    'cancelled',
  );
  assert.equal(
    getDateBasedProgramStatus(
      { status: 'completed', start_date: '2026-10-20', end_date: '2026-10-30' },
      '2026-10-20',
    ),
    'completed',
  );
});

test('programs remain planned before their start date', () => {
  assert.equal(
    getDateBasedProgramStatus(
      { status: 'planned', start_date: '2026-10-18', end_date: '2026-10-20' },
      '2026-10-17',
    ),
    'planned',
  );
});

test('date strings use the Philippine calendar date', () => {
  const date = new Date('2026-10-16T16:30:00.000Z');
  assert.equal(getPhilippineDateString(date), '2026-10-17');
});
