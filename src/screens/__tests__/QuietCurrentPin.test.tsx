/**
 * The pin (slice 004 `quiet-pages`, T001): today's markup of What Cairn covers and This machine is as it
 * was, every shape, outside any shell.
 *
 * Captured from the code as it stood before the slice changed either screen (`b73df5b`), and seen passing
 * there. Outside a notebook page both screens must render exactly this, element for element (SC-009), so
 * Current and every existing screen test are unchanged. A change here is a change to today's interface: it
 * needs its own decision, never a re-capture to make a test pass.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Limits } from '../Limits';
import { Teardown } from '../Teardown';
import { disclosureCases, teardownCases } from './quietCases';

const LIMITS: Record<string, string> = {
  "the background component can run":
    "<section class=\"settle rounded-2xl border border-sand-200 bg-white/60 p-8 max-w-2xl\"><h2 class=\"reflective text-3xl text-ink-900\">What Cairn covers</h2><ul class=\"mt-6 space-y-3 text-ink-700\"><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-500\"></span><span>Protected sites are blocked for every application on this machine that uses the system's own address lookup.</span></li><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-500\"></span><span>Cairn checks its own work every minute and puts it back if something changes it.</span></li></ul><h3 class=\"mt-10 text-sm font-medium tracking-wide text-ink-400 uppercase\">What it does not cover in this release</h3><ul class=\"mt-3 space-y-3 text-ink-700\"><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand-300\"></span><span>An application that looks up addresses on its own, rather than asking this machine, is not covered in this release. Some browsers can be set to do that.</span></li><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand-300\"></span><span>A browser that has already loaded a site may keep showing it from its own cache for a short while.</span></li></ul><h3 class=\"mt-10 text-sm font-medium tracking-wide text-ink-400 uppercase\">What is kept, and how</h3><p class=\"reflective mt-3 text-ink-700\">What Cairn records is encrypted on this machine. That protects it if the drive is copied or the machine is lost. It does not protect it from someone using this machine while it is unlocked.</p><p class=\"reflective mt-8 border-t border-sand-200 pt-6 text-ink-500\">Someone with administrator access to this machine can undo what Cairn does. Cairn is a wall to walk away from, not a lock.</p></section>",
  "the background component cannot run":
    "<section class=\"settle rounded-2xl border border-sand-200 bg-white/60 p-8 max-w-2xl\"><h2 class=\"reflective text-3xl text-ink-900\">What Cairn covers</h2><ul class=\"mt-6 space-y-3 text-ink-700\"><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-500\"></span><span>Protected sites are blocked for every application on this machine that uses the system's own address lookup.</span></li></ul><h3 class=\"mt-10 text-sm font-medium tracking-wide text-ink-400 uppercase\">What it does not cover in this release</h3><ul class=\"mt-3 space-y-3 text-ink-700\"><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand-300\"></span><span>An application that looks up addresses on its own, rather than asking this machine, is not covered in this release. Some browsers can be set to do that.</span></li><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand-300\"></span><span>A browser that has already loaded a site may keep showing it from its own cache for a short while.</span></li></ul><h3 class=\"mt-10 text-sm font-medium tracking-wide text-ink-400 uppercase\">What is kept, and how</h3><p class=\"reflective mt-3 text-ink-700\">What Cairn records is encrypted on this machine. That protects it if the drive is copied or the machine is lost. It does not protect it from someone using this machine while it is unlocked.</p><p class=\"reflective mt-8 border-t border-sand-200 pt-6 text-ink-500\">Someone with administrator access to this machine can undo what Cairn does. Cairn is a wall to walk away from, not a lock.</p></section>",
};

const TEARDOWN: Record<string, string> = {
  "as it was, with what was checked":
    "<section class=\"settle rounded-2xl border border-sand-200 bg-white/60 p-8 max-w-2xl\"><h2 class=\"reflective text-3xl text-ink-900\">This machine is as it was</h2><p class=\"reflective mt-4 text-lg text-ink-700\">Cairn checked each change it had made and undid it. What Cairn did not write is untouched.</p><ul class=\"mt-8 space-y-3 text-ink-700\"><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-500\"></span><span>The system’s list of site addresses is exactly as it was before Cairn.</span></li><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-500\"></span><span>The background component is removed.</span></li></ul></section>",
  "as it was, nothing listed":
    "<section class=\"settle rounded-2xl border border-sand-200 bg-white/60 p-8 max-w-2xl\"><h2 class=\"reflective text-3xl text-ink-900\">This machine is as it was</h2><p class=\"reflective mt-4 text-lg text-ink-700\">Cairn checked each change it had made and undid it. What Cairn did not write is untouched.</p></section>",
  "almost everything undone, with what was checked":
    "<section class=\"settle rounded-2xl border border-sand-200 bg-white/60 p-8 max-w-2xl\"><h2 class=\"reflective text-3xl text-ink-900\">Almost everything is undone</h2><p class=\"reflective mt-4 text-lg text-ink-700\">Cairn undid what it could and checked each one. These are still here, so you can decide what to do with them.</p><ul class=\"mt-8 space-y-3 text-ink-700\"><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss-500\"></span><span>The system’s list of site addresses is exactly as it was before Cairn.</span></li></ul><h3 class=\"mt-10 text-sm font-medium tracking-wide text-ink-400 uppercase\">Still here</h3><ul class=\"mt-3 space-y-3 text-ink-700\"><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500\"></span><span>the background component is still installed</span></li></ul></section>",
  "almost everything undone, only what is left":
    "<section class=\"settle rounded-2xl border border-sand-200 bg-white/60 p-8 max-w-2xl\"><h2 class=\"reflective text-3xl text-ink-900\">Almost everything is undone</h2><p class=\"reflective mt-4 text-lg text-ink-700\">Cairn undid what it could and checked each one. These are still here, so you can decide what to do with them.</p><h3 class=\"mt-10 text-sm font-medium tracking-wide text-ink-400 uppercase\">Still here</h3><ul class=\"mt-3 space-y-3 text-ink-700\"><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500\"></span><span>the background component is still installed</span></li><li class=\"flex gap-3\"><span aria-hidden=\"true\" class=\"mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500\"></span><span>a browser policy file Cairn wrote is still there</span></li></ul></section>",
};

describe('What Cairn covers, outside any shell, is today\'s markup', () => {
  it.each(Object.entries(disclosureCases))('%s', (name, disclosures) => {
    const { container } = render(<Limits disclosures={disclosures} />);
    expect(container.innerHTML).toBe(LIMITS[name]);
  });

  it('pins every case', () => {
    expect(Object.keys(LIMITS).sort()).toEqual(Object.keys(disclosureCases).sort());
  });
});

describe('This machine is as it was, outside any shell, is today\'s markup', () => {
  it.each(Object.entries(teardownCases))('%s', (name, report) => {
    const { container } = render(<Teardown report={report} />);
    expect(container.innerHTML).toBe(TEARDOWN[name]);
  });

  it('pins every case', () => {
    expect(Object.keys(TEARDOWN).sort()).toEqual(Object.keys(teardownCases).sort());
  });
});
