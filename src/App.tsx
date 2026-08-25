/**
 * The journey: choose what to protect, see what Cairn will change, turn it on.
 *
 * Everything that reduces protection lives behind deliberate navigation into
 * settings (FR-046) — there is nothing on this path that turns anything off.
 */
import { useEffect, useState } from 'react';

import { Button } from './components/Button';
import { Disclosure } from './screens/Disclosure';
import { Limits } from './screens/Limits';
import { Protection } from './screens/Protection';
import { Reaches } from './screens/Reaches';
import { Categories } from './screens/Setup/Categories';
import { CustomEntry } from './screens/Setup/CustomEntry';
import { Trail } from './screens/Trail';
import {
  getDisclosures,
  getProtectionState,
  getTrail,
  listCategories,
  setCategoryEnabled,
  turnProtectionOn,
  type CategoryPreset,
  type Disclosures,
  type ProtectionState,
  type Trail as TrailData,
} from './ipc';

type Step = 'choosing' | 'disclosure' | 'protected' | 'trail' | 'limits' | 'reaches';

export default function App() {
  const [step, setStep] = useState<Step>('choosing');
  const [categories, setCategories] = useState<CategoryPreset[]>([]);
  const [trail, setTrail] = useState<TrailData>();
  const [disclosures, setDisclosures] = useState<Disclosures>();
  const [state, setState] = useState<ProtectionState>();
  const [note, setNote] = useState<string>();

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

  async function toggle(id: CategoryPreset['id'], on: boolean) {
    try {
      await setCategoryEnabled(id, on);
      setNote(undefined);
      setCategories(await listCategories());
    } catch (problem) {
      // Switching a category off waits a day; the core says so in a sentence
      // meant to be read.
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
          {step === 'protected' && (
            <Button
              tone="quiet"
              onClick={async () => {
                setTrail(await getTrail());
                setStep('trail');
              }}
            >
              What is protected
            </Button>
          )}
          {step === 'protected' && (
            // Deliberate navigation, and nothing anywhere that draws someone
            // here: no count, no badge, no hint that there is something new to
            // look at (FR-030a, FR-030b).
            <Button tone="quiet" onClick={() => setStep('reaches')}>
              Today
            </Button>
          )}
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

        {step === 'trail' && trail && <Trail trail={trail} />}

        {step === 'reaches' && <Reaches />}

        {step === 'limits' && disclosures && <Limits disclosures={disclosures} />}
      </div>
    </main>
  );
}
