/**
 * The choosing step: what to protect, anywhere else, and the way forward.
 *
 * One composition of the two setup screens and the button that leaves them, so
 * `App` holds no layout of its own for the step. Each screen keeps its own
 * component and state; this only places them.
 */
import { Button } from '../../components/Button';
import type { CategoryPreset } from '../../ipc';
import { useNotebookPage } from '../../shell/notebookPage';
import { Categories } from './Categories';
import { CustomEntry } from './CustomEntry';

export function Choosing({
  categories,
  onToggle,
  note,
  onTurnOn,
}: {
  categories: CategoryPreset[];
  onToggle: (id: CategoryPreset['id'], on: boolean) => void;
  note?: string;
  /** What "Turn protection on" does: the way forward to the disclosure. */
  onTurnOn: () => void;
}) {
  const onPage = useNotebookPage();

  if (onPage) {
    return (
      <div className="nb-spread nb-choosing-spread">
        <div className="nb-page nb-choosing-left">
          <Categories categories={categories} onToggle={onToggle} note={note} />
        </div>
        <div className="nb-page nb-choosing-right">
          <CustomEntry />
          <div className="nb-choosing-foot">
            <button type="button" className="nb-choosing-turn-on" onClick={onTurnOn}>
              Turn protection on
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Categories categories={categories} onToggle={onToggle} note={note} />
      <CustomEntry />
      <div className="flex justify-end">
        <Button onClick={onTurnOn}>Turn protection on</Button>
      </div>
    </>
  );
}
