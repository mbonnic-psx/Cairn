/**
 * The journey: choose what to protect, see what Cairn will change, turn it on.
 *
 * Everything that reduces protection lives behind deliberate navigation into
 * settings (FR-046) — there is nothing on this path that turns anything off.
 */
import { useEffect, useState } from 'react';

import { Button } from './components/Button';
import { CheckIn, useCheckInSession } from './screens/CheckIn';
import { Disclosure } from './screens/Disclosure';
import { Limits } from './screens/Limits';
import { Protection } from './screens/Protection';
import { Reaches } from './screens/Reaches';
import { Categories } from './screens/Setup/Categories';
import { CustomEntry } from './screens/Setup/CustomEntry';
import { Trail, trailTitle } from './screens/Trail';
import {
  getDisclosures,
  getProtectionState,
  getTrail,
  listCategories,
  setCategoryEnabled,
  turnProtectionOn,
  waitingSentence,
  type CategoryPreset,
  type Disclosures,
  type ProtectionState,
  type Trail as TrailData,
} from './ipc';

type Step = 'choosing' | 'disclosure' | 'protected' | 'trail' | 'limits' | 'reaches' | 'checkin';

export default function App() {
  const [step, setStep] = useState<Step>('choosing');
  const [categories, setCategories] = useState<CategoryPreset[]>([]);
  const [trail, setTrail] = useState<TrailData>();
  const [disclosures, setDisclosures] = useState<Disclosures>();
  const [state, setState] = useState<ProtectionState>();
  const [note, setNote] = useState<string>();
  // Held here so the check-in's text survives a walk round the header.
  const checkIn = useCheckInSession();

  useEffect(() => {
    listCategories().then(setCategories).catch(() => undefined);
    getDisclosures().then(setDisclosures).catch(() => undefined);
    getProtectionState()
      .then((current) => {
        setState(current);
        if (current.status !== 'off') setStep('protected');
      })
      .catch(() => undefined);
  }, []);

  // Once protection is on, its own items stay in the header on every screen,
  // so the header does not change shape as a person moves around it (owner,
  // 2026-10-01). Before then there is nothing to show under them.
  const protectionOn = state !== undefined && state.status !== 'off';

  async function toggle(id: CategoryPreset['id'], on: boolean) {
    try {
      // Unticking comes off at once before anything is in force, and waits a
      // day once something is. When it waits, the box stays ticked — it is
      // still protected — and the screen says why rather than snapping back
      // without a word.
      const pending = await setCategoryEnabled(id, on);
      setNote(pending ? waitingSentence(pending) : undefined);
      setCategories(await listCategories());
    } catch (problem) {
      // The core's sentences are meant to be read as written.
      setNote(String(problem));
    }
  }

  async function confirm() {
    try {
      const current = await turnProtectionOn();
      setState(current);
      setTrail(await getTrail());
      setStep('protected');
    } catch (problem) {
      setNote(String(problem));
      setStep('choosing');
    }
  }

  return (
    <main className="min-h-screen px-6 py-12 sm:px-10">
      <header className="mx-auto mb-10 flex max-w-3xl items-baseline justify-between">
        <h1 className="reflective text-2xl text-ink-900">Cairn</h1>
        <nav className="flex gap-1 text-sm">
          {/* Always in the header, so it never changes shape (owner,
              2026-10-01): to choosing what to protect before protection is
              on, and to the protection screen once it is. Marked as the
              current page while one of those is showing. */}
          <Button
            tone="quiet"
            aria-current={
              step === 'choosing' || step === 'disclosure' || step === 'protected'
                ? 'page'
                : undefined
            }
            className="aria-[current=page]:text-ink-900"
            onClick={() => setStep(protectionOn ? 'protected' : 'choosing')}
          >
            Protection
          </Button>
          {protectionOn && (
            <Button
              tone="quiet"
              onClick={async () => {
                setTrail(await getTrail());
                setStep('trail');
              }}
            >
              {trailTitle(state?.status)}
            </Button>
          )}
          {protectionOn && (
            // Deliberate navigation, and nothing anywhere that draws someone
            // here: no count, no badge, no hint that there is something new to
            // look at (FR-030a, FR-030b).
            <Button tone="quiet" onClick={() => setStep('reaches')}>
              Today
            </Button>
          )}
          {/* Reachable at any time (FR-010), and by navigation only: nothing
              here says there is something to write, or that anything was
              written (FR-033). */}
          <Button tone="quiet" onClick={() => setStep('checkin')}>
            Tonight
          </Button>
          <Button tone="quiet" onClick={() => setStep('limits')}>
            What Cairn covers
          </Button>
        </nav>
      </header>

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {step === 'choosing' && (
          <>
            <Categories categories={categories} onToggle={toggle} note={note} />
            <CustomEntry />
            <div className="flex justify-end">
              <Button onClick={() => setStep('disclosure')}>Turn protection on</Button>
            </div>
          </>
        )}

        {step === 'disclosure' && (
          <Disclosure
            disclosures={disclosures}
            onConfirm={confirm}
            onBack={() => setStep('choosing')}
          />
        )}

        {step === 'protected' && <Protection state={state} />}

        {step === 'trail' && trail && <Trail trail={trail} status={state?.status} />}

        {step === 'reaches' && <Reaches />}

        {step === 'checkin' && <CheckIn session={checkIn} />}

        {step === 'limits' && disclosures && <Limits disclosures={disclosures} />}
      </div>
    </main>
  );
}
