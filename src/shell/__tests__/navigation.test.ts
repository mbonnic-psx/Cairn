import { describe, expect, it } from 'vitest';

import { tabsFor, type Step } from '../../navigation';

const steps: Step[] = ['choosing', 'disclosure', 'protected', 'trail', 'limits', 'reaches', 'checkin'];
const ids = (step: Step, on: boolean) => tabsFor(step, on).map((t) => t.id);
const currentIds = (step: Step, on: boolean) =>
  tabsFor(step, on)
    .filter((t) => t.current)
    .map((t) => t.id);

describe('tabsFor', () => {
  it('offers only protection, tonight and what cairn covers while protection is off, in header order', () => {
    expect(ids('choosing', false)).toEqual(['protection', 'checkin', 'limits']);
  });

  it('adds the trail and today after protection, once protection is on', () => {
    expect(ids('protected', true)).toEqual(['protection', 'trail', 'reaches', 'checkin', 'limits']);
  });

  it('uses today\'s words for the labels', () => {
    expect(tabsFor('protected', true, 'in_force').map((t) => t.label)).toEqual([
      'Protection',
      'What is protected',
      'Today',
      'Tonight',
      'What Cairn covers',
    ]);
    expect(tabsFor('protected', true, 'not_verified')[1].label).toBe('What you chose');
    expect(tabsFor('choosing', false).map((t) => t.label)).toEqual([
      'Protection',
      'Tonight',
      'What Cairn covers',
    ]);
  });

  it.each(['choosing', 'disclosure', 'protected'] as const)(
    'keeps protection current for %s, with or without protection on',
    (step) => {
      expect(currentIds(step, false)).toEqual(['protection']);
      expect(currentIds(step, true)).toEqual(['protection']);
    },
  );

  it.each([
    ['trail', 'trail'],
    ['reaches', 'reaches'],
    ['checkin', 'checkin'],
    ['limits', 'limits'],
  ] as const)('marks %s current for the %s step', (step, id) => {
    expect(currentIds(step, true)).toEqual([id]);
  });

  it('marks at most one tab current, and none that has no tab', () => {
    for (const step of steps) {
      for (const on of [false, true]) {
        expect(currentIds(step, on).length).toBeLessThanOrEqual(1);
      }
    }
    expect(currentIds('limits', false)).toEqual(['limits']);
    expect(currentIds('trail', false)).toEqual([]);
  });
});
