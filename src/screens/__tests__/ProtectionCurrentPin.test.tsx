/**
 * The pin (slice 004 `protection-page`, T001): today's markup of the
 * Protection and What is protected screens, every state, outside any shell.
 *
 * Captured from the code as it stood before the slice changed either screen,
 * and seen passing there. Outside a notebook page both screens must render
 * exactly this, element for element (SC-009), so Current and every existing
 * screen test are unchanged. A change here is a change to today's interface:
 * it needs its own decision, never a re-capture to make a test pass.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Protection } from '../Protection';
import { Trail } from '../Trail';
import { installFakeCore, never, type FakeCore } from './fakeCore';
import { cases, trailCases } from './pinCases';

const PROTECTION: Record<string, string> = {
  checking:
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><p class="text-ink-400">Checking this machine…</p></section>',
  trouble:
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><p class="text-ink-500">Cairn could not read its settings just now.</p></section>',
  off: '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><span class="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase bg-sand-100 text-ink-500">Protection is off</span><h2 class="reflective mt-6 text-3xl text-ink-900">Protection is off</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">Nothing is protected on this machine yet.</p></section>',
  'in force':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><span class="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase bg-moss-100 text-moss-600">Protection is on</span><h2 class="reflective mt-6 text-3xl text-ink-900">Protection is on</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">Cairn checked the system itself, and what you chose is in force.</p><dl class="mt-8 grid grid-cols-2 gap-6 text-sm"><div><dt class="text-ink-400">Addresses in force</dt><dd class="mt-1 text-2xl text-ink-900">42</dd></div><div><dt class="text-ink-400">Last checked</dt><dd class="mt-1 text-2xl text-ink-900">not yet</dd></div></dl></section>',
  'not confirmed':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><span class="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase bg-amber-100 text-amber-600">Not confirmed just now</span><h2 class="reflective mt-6 text-3xl text-ink-900">Not confirmed just now</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">Cairn could not check the system a moment ago, so it is not showing protection as on. It keeps trying, and it keeps what you chose.</p><dl class="mt-8 grid grid-cols-2 gap-6 text-sm"><div><dt class="text-ink-400">Addresses in force</dt><dd class="mt-1 text-2xl text-ink-900">40</dd></div><div><dt class="text-ink-400">Last checked</dt><dd class="mt-1 text-2xl text-ink-900">not yet</dd></div></dl></section>',
  'off, a change waiting':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><span class="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase bg-sand-100 text-ink-500">Protection is off</span><h2 class="reflective mt-6 text-3xl text-ink-900">Protection is off</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">Nothing is protected on this machine yet.</p><div class="mt-8 rounded-xl bg-amber-100 p-6"><p class="text-ink-900">Turn protection off</p><p class="reflective mt-2 text-ink-700">This takes effect in 23 hours. Until then, nothing changes.</p><button class="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed bg-transparent text-ink-500 hover:text-ink-900 hover:bg-sand-100 mt-4 -ml-2">Keep things as they are</button></div></section>',
  'in force, a change waiting':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><span class="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase bg-moss-100 text-moss-600">Protection is on</span><h2 class="reflective mt-6 text-3xl text-ink-900">Protection is on</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">Cairn checked the system itself, and what you chose is in force.</p><div class="mt-8 rounded-xl bg-amber-100 p-6"><p class="text-ink-900">Turn protection off</p><p class="reflective mt-2 text-ink-700">This takes effect in 23 hours. Until then, nothing changes.</p><button class="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed bg-transparent text-ink-500 hover:text-ink-900 hover:bg-sand-100 mt-4 -ml-2">Keep things as they are</button></div><dl class="mt-8 grid grid-cols-2 gap-6 text-sm"><div><dt class="text-ink-400">Addresses in force</dt><dd class="mt-1 text-2xl text-ink-900">42</dd></div><div><dt class="text-ink-400">Last checked</dt><dd class="mt-1 text-2xl text-ink-900">not yet</dd></div></dl></section>',
  'in force, a change ready':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><span class="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase bg-moss-100 text-moss-600">Protection is on</span><h2 class="reflective mt-6 text-3xl text-ink-900">Protection is on</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">Cairn checked the system itself, and what you chose is in force.</p><div class="mt-8 rounded-xl bg-amber-100 p-6"><p class="text-ink-900">Turn protection off</p><p class="reflective mt-2 text-ink-700">This is ready to take effect.</p><button class="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed bg-transparent text-ink-500 hover:text-ink-900 hover:bg-sand-100 mt-4 -ml-2">Keep things as they are</button></div><dl class="mt-8 grid grid-cols-2 gap-6 text-sm"><div><dt class="text-ink-400">Addresses in force</dt><dd class="mt-1 text-2xl text-ink-900">42</dd></div><div><dt class="text-ink-400">Last checked</dt><dd class="mt-1 text-2xl text-ink-900">not yet</dd></div></dl></section>',
  'not confirmed, a change waiting':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><span class="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase bg-amber-100 text-amber-600">Not confirmed just now</span><h2 class="reflective mt-6 text-3xl text-ink-900">Not confirmed just now</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">Cairn could not check the system a moment ago, so it is not showing protection as on. It keeps trying, and it keeps what you chose.</p><div class="mt-8 rounded-xl bg-amber-100 p-6"><p class="text-ink-900">Turn protection off</p><p class="reflective mt-2 text-ink-700">This takes effect in 23 hours. Until then, nothing changes.</p><button class="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed bg-transparent text-ink-500 hover:text-ink-900 hover:bg-sand-100 mt-4 -ml-2">Keep things as they are</button></div><dl class="mt-8 grid grid-cols-2 gap-6 text-sm"><div><dt class="text-ink-400">Addresses in force</dt><dd class="mt-1 text-2xl text-ink-900">40</dd></div><div><dt class="text-ink-400">Last checked</dt><dd class="mt-1 text-2xl text-ink-900">not yet</dd></div></dl></section>',
  'not confirmed, a change ready':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><span class="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase bg-amber-100 text-amber-600">Not confirmed just now</span><h2 class="reflective mt-6 text-3xl text-ink-900">Not confirmed just now</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">Cairn could not check the system a moment ago, so it is not showing protection as on. It keeps trying, and it keeps what you chose.</p><div class="mt-8 rounded-xl bg-amber-100 p-6"><p class="text-ink-900">Turn protection off</p><p class="reflective mt-2 text-ink-700">This is ready to take effect.</p><button class="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed bg-transparent text-ink-500 hover:text-ink-900 hover:bg-sand-100 mt-4 -ml-2">Keep things as they are</button></div><dl class="mt-8 grid grid-cols-2 gap-6 text-sm"><div><dt class="text-ink-400">Addresses in force</dt><dd class="mt-1 text-2xl text-ink-900">40</dd></div><div><dt class="text-ink-400">Last checked</dt><dd class="mt-1 text-2xl text-ink-900">not yet</dd></div></dl></section>',
  'in force, no change (null)':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><span class="inline-block rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase bg-moss-100 text-moss-600">Protection is on</span><h2 class="reflective mt-6 text-3xl text-ink-900">Protection is on</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">Cairn checked the system itself, and what you chose is in force.</p><dl class="mt-8 grid grid-cols-2 gap-6 text-sm"><div><dt class="text-ink-400">Addresses in force</dt><dd class="mt-1 text-2xl text-ink-900">42</dd></div><div><dt class="text-ink-400">Last checked</dt><dd class="mt-1 text-2xl text-ink-900">not yet</dd></div></dl></section>',
};

const TRAIL: Record<string, string> = {
  'list in force':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><h2 class="reflective text-3xl text-ink-900">What you are protecting</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">3 addresses, across 2 lists and whatever you have added yourself.</p><ul class="mt-8 divide-y divide-sand-200"><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">example.com</span></li><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">www.example.com</span><span class="text-sm text-ink-400">added with its root address</span></li><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">news.example</span></li></ul><p class="mt-8 border-t border-sand-200 pt-6 text-ink-500">Taking something out protects you less, so it waits a day before it takes effect. You can ask for that here, and cancel it at any time in that day.</p></section>',
  'list not confirmed':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><h2 class="reflective text-3xl text-ink-900">What you have chosen</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">3 addresses, across 2 lists and whatever you have added yourself.</p><p class="mt-3 max-w-prose text-amber-600">Cairn has not confirmed this is in force just now. It keeps trying, and it keeps what you chose.</p><ul class="mt-8 divide-y divide-sand-200"><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">example.com</span></li><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">www.example.com</span><span class="text-sm text-ink-400">added with its root address</span></li><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">news.example</span></li></ul><p class="mt-8 border-t border-sand-200 pt-6 text-ink-500">Taking something out protects you less, so it waits a day before it takes effect. You can ask for that here, and cancel it at any time in that day.</p></section>',
  'list off':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><h2 class="reflective text-3xl text-ink-900">What you have chosen</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">3 addresses, across 2 lists and whatever you have added yourself.</p><ul class="mt-8 divide-y divide-sand-200"><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">example.com</span></li><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">www.example.com</span><span class="text-sm text-ink-400">added with its root address</span></li><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">news.example</span></li></ul><p class="mt-8 border-t border-sand-200 pt-6 text-ink-500">Taking something out protects you less, so it waits a day before it takes effect. You can ask for that here, and cancel it at any time in that day.</p></section>',
  'list no status':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><h2 class="reflective text-3xl text-ink-900">What you have chosen</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">3 addresses, across 2 lists and whatever you have added yourself.</p><ul class="mt-8 divide-y divide-sand-200"><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">example.com</span></li><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">www.example.com</span><span class="text-sm text-ink-400">added with its root address</span></li><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">news.example</span></li></ul><p class="mt-8 border-t border-sand-200 pt-6 text-ink-500">Taking something out protects you less, so it waits a day before it takes effect. You can ask for that here, and cancel it at any time in that day.</p></section>',
  'list in force, no www companion':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><h2 class="reflective text-3xl text-ink-900">What you are protecting</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">1 addresses, across 1 lists and whatever you have added yourself.</p><ul class="mt-8 divide-y divide-sand-200"><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">example.com</span></li></ul><p class="mt-8 border-t border-sand-200 pt-6 text-ink-500">Taking something out protects you less, so it waits a day before it takes effect. You can ask for that here, and cancel it at any time in that day.</p></section>',
  'list not confirmed, no www companion':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><h2 class="reflective text-3xl text-ink-900">What you have chosen</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">1 addresses, across 1 lists and whatever you have added yourself.</p><p class="mt-3 max-w-prose text-amber-600">Cairn has not confirmed this is in force just now. It keeps trying, and it keeps what you chose.</p><ul class="mt-8 divide-y divide-sand-200"><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">example.com</span></li></ul><p class="mt-8 border-t border-sand-200 pt-6 text-ink-500">Taking something out protects you less, so it waits a day before it takes effect. You can ask for that here, and cancel it at any time in that day.</p></section>',
  'list off, no www companion':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><h2 class="reflective text-3xl text-ink-900">What you have chosen</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">1 addresses, across 1 lists and whatever you have added yourself.</p><ul class="mt-8 divide-y divide-sand-200"><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">example.com</span></li></ul><p class="mt-8 border-t border-sand-200 pt-6 text-ink-500">Taking something out protects you less, so it waits a day before it takes effect. You can ask for that here, and cancel it at any time in that day.</p></section>',
  'list no status, no www companion':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><h2 class="reflective text-3xl text-ink-900">What you have chosen</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">1 addresses, across 1 lists and whatever you have added yourself.</p><ul class="mt-8 divide-y divide-sand-200"><li class="flex items-baseline justify-between py-3"><span class="text-ink-900">example.com</span></li></ul><p class="mt-8 border-t border-sand-200 pt-6 text-ink-500">Taking something out protects you less, so it waits a day before it takes effect. You can ask for that here, and cancel it at any time in that day.</p></section>',
  'list in force, empty':
    '<section class="settle rounded-2xl border border-sand-200 bg-white/60 p-8 "><h2 class="reflective text-3xl text-ink-900">What you are protecting</h2><p class="reflective mt-3 max-w-prose text-lg text-ink-700">0 addresses, across 0 lists and whatever you have added yourself.</p><ul class="mt-8 divide-y divide-sand-200"></ul><p class="mt-8 border-t border-sand-200 pt-6 text-ink-500">Taking something out protects you less, so it waits a day before it takes effect. You can ask for that here, and cancel it at any time in that day.</p></section>',
};

let core: FakeCore | undefined;
afterEach(() => {
  core?.remove();
  core = undefined;
});

describe("Protection outside a notebook page renders today's markup (SC-009)", () => {
  it('while the machine is being checked', () => {
    core = installFakeCore({ get_protection_state: never });
    const { container } = render(<Protection />);
    expect(container.innerHTML).toBe(PROTECTION['checking']);
  });

  it('when the read could not be made', async () => {
    core = installFakeCore({
      get_protection_state: () => {
        throw 'Cairn could not read its settings just now.';
      },
    });
    const { container } = render(<Protection />);
    await screen.findByText('Cairn could not read its settings just now.');
    expect(container.innerHTML).toBe(PROTECTION['trouble']);
  });

  it.each(Object.keys(cases))('%s', (name) => {
    const { container } = render(<Protection {...cases[name]!} />);
    expect(container.innerHTML).toBe(PROTECTION[name]);
  });
});

describe("What is protected outside a notebook page renders today's markup (SC-009)", () => {
  it.each(Object.keys(trailCases))('%s', (name) => {
    const { container } = render(<Trail {...trailCases[name]!} />);
    expect(container.innerHTML).toBe(TRAIL[name]);
  });
});
