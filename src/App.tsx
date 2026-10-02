/**
 * The journey: choose what to protect, see what Cairn will change, turn it on.
 *
 * Everything that reduces protection lives behind deliberate navigation into
 * settings (FR-046) — there is nothing on this path that turns anything off.
 */
import { useEffect, useState } from 'react';

import { Button } from './components/Button';
import { tabsFor, type Step, type TabId } from './navigation';
import { CheckIn, useCheckInSession } from './screens/CheckIn';
import { Disclosure } from './screens/Disclosure';
import { Limits } from './screens/Limits';
import { Protection } from './screens/Protection';
import { Reaches } from './screens/Reaches';
import { Categories } from './screens/Setup/Categories';
import { CustomEntry } from './screens/Setup/CustomEntry';
import { Trail } from './screens/Trail';
import { LookSwitch } from './look/LookSwitch';
import type { Look } from './look/look';
import { CurrentShell } from './shell/CurrentShell';
import { NotebookShell } from './shell/NotebookShell';
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

export default function App({ devBuild = import.meta.env.DEV }: { devBuild?: boolean }) {
  // Chosen at the switch, kept nowhere, and always 'current' outside a dev build.
  const [chosenLook, setLook] = useState<Look>('current');
  const look: Look = devBuild ? chosenLook : 'current';
  const [step, setStep] = useState<Step>('choosing');
  const [categories, setCategories] = useState<CategoryPreset[]>([]);
  const [trail, setTrail] = useState<TrailData>();
  const [disclosures, setDisclosures] = useState<Disclosures>();
  const [state, setState] = useState<ProtectionState>();
  const [note, setNote] = useState<string>();
  // Held here so the check-in's text survives a walk round the header.
  const checkIn = useCheckInSession();

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => undefined);
    getDisclosures()
      .then(setDisclosures)
      .catch(() => undefined);
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

  async function select(id: TabId) {
    switch (id) {
      case 'protection':
        setStep(protectionOn ? 'protected' : 'choosing');
        break;
      case 'trail':
        setTrail(await getTrail());
        setStep('trail');
        break;
      case 'reaches':
        setStep('reaches');
        break;
      case 'checkin':
        checkIn.open();
        setStep('checkin');
        break;
      case 'limits':
        setStep('limits');
        break;
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

  const Shell = look === 'morning' ? NotebookShell : CurrentShell;
  const tabs = tabsFor(step, protectionOn, state?.status);

  return (
    <>
      {/* `import.meta.env.DEV` is a build-time constant, so the bundler drops the switch from a production build. */}
      {import.meta.env.DEV && devBuild && <LookSwitch look={look} onChange={setLook} />}
      <Shell tabs={tabs} onSelect={(id) => void select(id)}>
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
      </Shell>
    </>
  );
}
