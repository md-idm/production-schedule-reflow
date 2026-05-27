import { describe, expect, it } from 'vitest';

import { calculateEndDateWithShifts, getWorkPeriods } from './date-utils.js';
import { weekdayShifts } from '../scenarios/scenario-utils.js';

const mondayToFriday = weekdayShifts();

describe('calculateEndDateWithShifts', () => {
  it('carries remaining work into the next shift day', () => {
    const endDate = calculateEndDateWithShifts(
      '2024-01-01T16:00:00.000Z',
      180,
      mondayToFriday,
    );

    expect(endDate).toBe('2024-01-02T10:00:00.000Z');
  });

  it('pauses before maintenance and resumes afterward', () => {
    const endDate = calculateEndDateWithShifts(
      '2024-01-02T09:00:00.000Z',
      180,
      mondayToFriday,
      [
        {
          startDate: '2024-01-02T10:00:00.000Z',
          endDate: '2024-01-02T14:00:00.000Z',
        },
      ],
    );

    expect(endDate).toBe('2024-01-02T16:00:00.000Z');
  });

  it('throws when a shift has endHour less than or equal to startHour', () => {
    expect(() =>
      calculateEndDateWithShifts('2024-01-01T08:00:00.000Z', 60, [
        { dayOfWeek: 1, startHour: 8, endHour: 8 },
      ]),
    ).toThrow(/endHour .* must be greater than startHour/);
  });
});

describe('getWorkPeriods', () => {
  it('splits work around a maintenance window', () => {
    const periods = getWorkPeriods(
      '2024-01-02T09:00:00.000Z',
      180,
      mondayToFriday,
      [
        {
          startDate: '2024-01-02T10:00:00.000Z',
          endDate: '2024-01-02T14:00:00.000Z',
        },
      ],
    );

    expect(periods).toEqual([
      {
        startDate: '2024-01-02T09:00:00.000Z',
        endDate: '2024-01-02T10:00:00.000Z',
      },
      {
        startDate: '2024-01-02T14:00:00.000Z',
        endDate: '2024-01-02T16:00:00.000Z',
      },
    ]);
  });
});
