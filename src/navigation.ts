/**
 * The one place that decides which destinations the header offers and which
 * one is showing. Every shell renders from it, so none can drift from another.
 */
import type { ProtectionStatus } from './ipc';
import { trailTitle } from './screens/Trail';

export type Step = 'choosing' | 'disclosure' | 'protected' | 'trail' | 'limits' | 'reaches' | 'checkin';
export type TabId = 'protection' | 'trail' | 'reaches' | 'checkin' | 'limits';
export interface Tab {
  id: TabId;
  label: string;
  current: boolean;
}

const stepOf: Record<Step, TabId> = {
  choosing: 'protection',
  disclosure: 'protection',
  protected: 'protection',
  trail: 'trail',
  reaches: 'reaches',
  checkin: 'checkin',
  limits: 'limits',
};

export function tabsFor(step: Step, protectionOn: boolean, status?: ProtectionStatus): Tab[] {
  const all: Array<[TabId, string, boolean]> = [
    ['protection', 'Protection', true],
    ['trail', trailTitle(status), protectionOn],
    // Always offered: a person's reaches are theirs whether protection is on
    // now or not (owner, 2026-10-01, history-by-site demo).
    ['reaches', 'Today', true],
    ['checkin', 'Tonight', true],
    ['limits', 'What Cairn covers', true],
  ];
  return all
    .filter(([, , present]) => present)
    .map(([id, label]) => ({ id, label, current: stepOf[step] === id }));
}
