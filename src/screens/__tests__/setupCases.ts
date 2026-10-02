/**
 * The states the setup screens can show, as the props and core answers that produce them. The pin renders each
 * outside any shell; the page tests render each on a notebook page and compare the words.
 */
import type { CategoryPreset, Disclosures, ProtectionState, ProtectionStatus } from '../../ipc';

export const categories: CategoryPreset[] = [
  { id: 'social', label: 'Social', enabled: true, entry_count: 42, edited: false },
  { id: 'news', label: 'News', enabled: false, entry_count: 18, edited: true },
  { id: 'gambling', label: 'Gambling', enabled: true, entry_count: 120, edited: true },
  { id: 'shopping', label: 'Shopping', enabled: false, entry_count: 30, edited: false },
];

export const waitingNote =
  'Turning this off protects you less, so it waits until tomorrow at this time. Until then, nothing changes.';

export const disclosures: Disclosures = {
  in_force: [
    "Protected sites are blocked for every application on this machine that uses the system's own address lookup.",
    'Cairn checks its own work every minute and puts it back if something changes it.',
  ],
  not_covered: [
    'An application that looks up addresses on its own, rather than asking this machine, is not covered in this release. Some browsers can be set to do that.',
    'A browser that has already loaded a site may keep showing it from its own cache for a short while.',
  ],
  helper: 'Cairn will ask once for permission to install a small background component.',
  encryption: 'What Cairn records is encrypted on this machine.',
  administrator:
    'Someone with administrator access to this machine can undo what Cairn does. Cairn is a wall to walk away from, not a lock.',
};

export const localhostReason =
  'Cairn keeps localhost working — the machine and Cairn itself use it to reach things on this computer. Try the address of a site instead.';

/** A read-back of the machine, as the core would answer it. */
export const readBack = (status: ProtectionStatus): ProtectionState => ({
  status,
  since: null,
  verified_at: null,
  entry_count_verified: 0,
});
