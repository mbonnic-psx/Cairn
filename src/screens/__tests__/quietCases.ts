/**
 * Every shape What Cairn covers and This machine is as it was can show, as the props that produce it
 * (slice 004 `quiet-pages`). Since the reveal, the words-kept tests render each on a notebook page and compare its
 * words with the markup captured before the reveal (`beforeTheReveal.ts`). The disclosure words are the core's own
 * (`src-tauri/src/ipc/state.rs`, `disclosures`).
 */
import type { Disclosures, TeardownReport } from '../../ipc';

const covered = [
  "Protected sites are blocked for every application on this machine that uses the system's own address lookup.",
  'Cairn checks its own work every minute and puts it back if something changes it.',
];

const base: Disclosures = {
  in_force: covered,
  not_covered: [
    'An application that looks up addresses on its own, rather than asking this machine, is not covered in this release. Some browsers can be set to do that.',
    'A browser that has already loaded a site may keep showing it from its own cache for a short while.',
  ],
  helper: 'Cairn keeps protection in force with a small background component.',
  encryption:
    'What Cairn records is encrypted on this machine. That protects it if the drive is copied or the machine is lost. It does not protect it from someone using this machine while it is unlocked.',
  administrator:
    'Someone with administrator access to this machine can undo what Cairn does. Cairn is a wall to walk away from, not a lock.',
};

export const disclosureCases: Record<string, Disclosures> = {
  'the background component can run': base,
  'the background component cannot run': { ...base, in_force: [covered[0]!] },
};

export const teardownCases: Record<string, TeardownReport> = {
  'as it was, with what was checked': {
    complete: true,
    confirmed: [
      'The system’s list of site addresses is exactly as it was before Cairn.',
      'The background component is removed.',
    ],
    residue: [],
  },
  'as it was, nothing listed': { complete: true, confirmed: [], residue: [] },
  'almost everything undone, with what was checked': {
    complete: false,
    confirmed: ['The system’s list of site addresses is exactly as it was before Cairn.'],
    residue: ['the background component is still installed'],
  },
  'almost everything undone, only what is left': {
    complete: false,
    confirmed: [],
    residue: ['the background component is still installed', 'a browser policy file Cairn wrote is still there'],
  },
};
