#!/usr/bin/env python3
"""N28: Over time's rows in every view, at 800x600 and 1280x800, in the browser named by AGENT_BROWSER_SESSION.
Writes ../n28-chromium-<locale>.json and the n28 screenshots. Reads only: the cores answer reads, nothing is changed.

Usage: AGENT_BROWSER_SESSION=fc28us n28_table.py en-US
"""
import json, os, subprocess, sys, time

H = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(H, '..')
SH = os.path.join(H, 'n26.sh')
MEASURE = open(os.path.join(H, 'n28-measure.js')).read()


def ab(*args):
    return subprocess.run(['agent-browser', *args], capture_output=True, text=True).stdout.strip()


def sh(*args):
    return subprocess.run([SH, *args], capture_output=True, text=True).stdout.strip()


SINCE = ('range', '2025-01-01')
STATES = [
    # key, what, seed, steps (after Today -> Over time)
    ('c-daybyday-since2025', 'Day by day, From 2025-01-01: weekly rows, one over 999', 'c', [('click', 'day by day'), SINCE]),
    ('c-daybyday-default', 'Day by day, opening range: daily rows', 'c', [('click', 'day by day')]),
    ('c-bysite-default', 'By site, opening range: 1,234 / 56 / 7 / 2 (N26 compare)', 'c', [('click', 'by site')]),
    ('c-bysite-since2025', 'By site, From 2025-01-01', 'c', [('click', 'by site'), SINCE]),
    ('c-byhour-since2025', 'By hour, From 2025-01-01', 'c', [('click', 'by hour'), SINCE]),
    ('c-byday-since2025', 'By day, From 2025-01-01', 'c', [('click', 'by day'), SINCE]),
    ('d-bysite-default', 'By site, short names 2 / 2 / 1 (N26 compare)', 'd', [('click', 'by site')]),
    ('g-bysite-default', 'By site, long names that wrap, one count over 999', 'g', [('click', 'by site')]),
    ('g-byhour-default', 'By hour, long-names history', 'g', [('click', 'by hour')]),
    ('g-byday-default', 'By day, long-names history', 'g', [('click', 'by day')]),
    ('g-daybyday-default', 'Day by day, long-names history', 'g', [('click', 'day by day')]),
]
SHOTS = {
    ('c-daybyday-since2025', 800): 'tightest',
    ('c-daybyday-since2025', 1280): 'tightest',
    ('c-bysite-default', 800): None,
    ('d-bysite-default', 800): None,
    ('g-bysite-default', 800): None,
    ('g-bysite-default', 1280): None,
    ('c-byhour-since2025', 800): None,
}
SCROLL_TO = "(()=>{const n='%s';const li=[...document.querySelectorAll('.nb-reaches-log li')].find(l=>l.querySelector('.nb-reaches-site')?.textContent===n);if(!li)return 'no row';li.scrollIntoView({block:'center'});return 'scrolled'})()"


def main():
    locale = sys.argv[1]
    out = []
    shots = []
    for (w, h) in [(800, 600), (1280, 800)]:
        ab('set', 'viewport', str(w), str(h))
        for key, what, seed, steps in STATES:
            sh('go', seed)
            time.sleep(1.2)
            for kind, arg in [('click', 'today'), ('click', 'over time'), *steps]:
                sh(kind, arg)
                time.sleep(1.0)
            time.sleep(0.8)
            m = json.loads(json.loads(ab('eval', MEASURE)))
            out.append({'key': key, 'state': what, 'seed': seed, 'viewport': [w, h], **m})
            print(locale, w, h, key, '->', m.get('rowCount'), 'under12', m.get('underTwelveUnits'), 'start', m.get('barStart'),
                  'end', m.get('barEnd'), 'min', m.get('minGap'), 'over', m.get('rowsOverPage'), m.get('pageScrollsSideways'),
                  file=sys.stderr)
            if (key, w) in SHOTS:
                if SHOTS[(key, w)] == 'tightest' and m.get('minGap'):
                    ab('eval', SCROLL_TO % m['minGap']['name'])
                    time.sleep(0.4)
                name = f'n28-{key}-{locale}-{w}x{h}.png'
                ab('screenshot', os.path.join(D, name))
                shots.append(name)
    path = os.path.join(D, f'n28-chromium-{locale}.json')
    with open(path, 'w') as f:
        json.dump({'measured_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'session': os.environ.get('AGENT_BROWSER_SESSION'),
                   'where': 'Chromium (agent-browser, headless) on WSL2; Vite dev build of the worktree at 3d2882c on '
                            '127.0.0.1:1477; history answers from the real core over 127.0.0.1 HTTP, not Tauri IPC',
                   'screenshots': shots, 'readings': out}, f, indent=1, ensure_ascii=False)
    print(path, file=sys.stderr)


main()
