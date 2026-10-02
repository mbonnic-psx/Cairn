/**
 * Every state the Protection and What is protected screens can show, as the
 * props that produce it. The pin renders each outside any shell; the page
 * tests render each on a notebook page and compare the words.
 */
import type {
  PendingChange,
  ProtectionState,
  ProtectionStatus,
  Trail as TrailData,
} from '../../ipc';

/** Fixed, so the pin never depends on the clock: "Last checked" reads "not yet". */
const base: ProtectionState = {
  status: 'in_force',
  since: 1_700_000_000,
  verified_at: null,
  entry_count_verified: 42,
};

export const waiting: PendingChange = {
  id: 'abc',
  what: 'Turn protection off',
  time_remaining: '23 hours',
  eligible_now: false,
};

export const ready: PendingChange = { ...waiting, id: 'def', eligible_now: true };

export interface ProtectionCase {
  state: ProtectionState;
  pending?: PendingChange | null;
}

export const cases: Record<string, ProtectionCase> = {
  off: { state: { ...base, status: 'off', since: null, entry_count_verified: 0 } },
  'in force': { state: base },
  'not confirmed': {
    state: { ...base, status: 'not_verified', entry_count_verified: 40 },
  },
  'off, a change waiting': {
    state: { ...base, status: 'off', since: null, entry_count_verified: 0 },
    pending: waiting,
  },
  'in force, a change waiting': { state: base, pending: waiting },
  'in force, a change ready': { state: base, pending: ready },
  'not confirmed, a change waiting': {
    state: { ...base, status: 'not_verified', entry_count_verified: 40 },
    pending: waiting,
  },
  'not confirmed, a change ready': {
    state: { ...base, status: 'not_verified', entry_count_verified: 40 },
    pending: ready,
  },
  'in force, no change (null)': { state: base, pending: null },
};

const entries: TrailData['entries'] = [
  { domain: 'example.com', sources: [], auto_www: false },
  { domain: 'www.example.com', sources: [], auto_www: true },
  { domain: 'news.example', sources: [], auto_www: false },
];

export interface TrailCase {
  trail: TrailData;
  status?: ProtectionStatus;
}

const statuses: [string, ProtectionStatus | undefined][] = [
  ['in force', 'in_force'],
  ['not confirmed', 'not_verified'],
  ['off', 'off'],
  ['no status', undefined],
];

export const trailCases: Record<string, TrailCase> = Object.fromEntries([
  ...statuses.map(([name, status]) => [
    `list ${name}`,
    { trail: { entries, enabled_categories: ['social', 'news'] }, status },
  ]),
  ...statuses.map(([name, status]) => [
    `list ${name}, no www companion`,
    { trail: { entries: [entries[0]!], enabled_categories: ['social'] }, status },
  ]),
  [
    'list in force, empty',
    { trail: { entries: [], enabled_categories: [] }, status: 'in_force' },
  ],
]);
