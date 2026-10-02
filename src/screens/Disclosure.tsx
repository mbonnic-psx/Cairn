/**
 * What Cairn is about to do to this machine, before it does any of it.
 *
 * FR-016 and Principle III: the hosts file is machine-wide, and the background
 * component is machine-wide, so this is disclosed plainly and confirmed
 * explicitly before the first system change. Not a licence agreement — a short,
 * readable account of what changes, and how it comes back.
 */
import { useEffect, useState } from 'react';

import { getDisclosures, type Disclosures } from '../ipc';

export function Disclosure({
  onConfirm,
  onBack,
  disclosures,
}: {
  onConfirm: () => void;
  onBack: () => void;
  disclosures?: Disclosures;
}) {
  const [details, setDetails] = useState<Disclosures | undefined>(disclosures);

  useEffect(() => {
    if (disclosures) return;
    getDisclosures().then(setDetails).catch(() => setDetails(undefined));
  }, [disclosures]);

  return (
    <div className="nb-spread nb-disclosure-spread">
      <div className="nb-page nb-disclosure-left">
        <h2 className="nb-disclosure-title">Before Cairn changes anything</h2>

        <p className="nb-disclosure-lead">
          Cairn protects this whole machine, so the changes it makes affect everyone who
          uses it. It writes only inside its own marked section, and it keeps a copy of
          what was there first.
        </p>

        {details && (
          <>
            <ul className="nb-disclosure-list">
              {details.in_force.map((line) => (
                <li key={line} className="nb-disclosure-line">
                  <span aria-hidden className="nb-disclosure-dot nb-disclosure-dot--in-force" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <p className="nb-disclosure-helper">{details.helper}</p>
          </>
        )}
      </div>

      <div className="nb-page nb-disclosure-right">
        {details && (
          <>
            <h3 className="nb-disclosure-subtitle">What this does not cover</h3>
            <ul className="nb-disclosure-list">
              {details.not_covered.map((line) => (
                <li key={line} className="nb-disclosure-line">
                  <span aria-hidden className="nb-disclosure-dot nb-disclosure-dot--not-covered" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <p className="nb-disclosure-administrator">{details.administrator}</p>
          </>
        )}

        {/* The way forward is the foot of the right page, with the details or without them. */}
        <div className="nb-disclosure-foot">
          <button type="button" className="nb-disclosure-confirm" onClick={onConfirm}>
            Yes, set this up
          </button>
          <button type="button" className="nb-disclosure-back" onClick={onBack}>
            Not yet
          </button>
        </div>
      </div>
    </div>
  );
}
