#!/usr/bin/env python3
"""N26: every state that draws a first-count sentence or a grouped count, at each layout, in the browser named by
AGENT_BROWSER_SESSION. Writes ../n26-measurements-<locale>.json. Reads only: the cores answer reads, nothing is changed.

Usage: AGENT_BROWSER_SESSION=fc26us n26_table.py en-US
"""
import json, os, subprocess, sys, time

H = os.path.dirname(os.path.abspath(__file__))
SH = os.path.join(H, 'n26.sh')


def ab(*args):
    return subprocess.run(['agent-browser', *args], capture_output=True, text=True).stdout.strip()


def sh(*args):
    return subprocess.run([SH, *args], capture_output=True, text=True).stdout.strip()


STATES = [
    # name, seed, steps
    ('F2 Over time, By site (range does not hold the first count)', 'c', [('click', 'today'), ('click', 'over time')]),
    ('F3 Over time, Day by day, From 2025-01-01 (longest sentence; weekly rows, one over 999)', 'c',
     [('click', 'today'), ('click', 'over time'), ('click', 'day by day'), ('range', '2025-01-01')]),
    ('F3 Over time, By site, first count yesterday (no year)', 'd', [('click', 'today'), ('click', 'over time')]),
    ('Today on the first day', 'f', [('click', 'today')]),
    ('Check-in on the first day', 'f', [('click', 'tonight')]),
    ('Today the next day (no sentence expected)', 'd', [('click', 'today')]),
    ('Check-in the next day (no sentence expected)', 'd', [('click', 'tonight')]),
]
LAYOUTS = [((800, 600), None), ((800, 600), '2px'), ((1280, 800), None), ((2560, 1600), None)]


def main():
    locale = sys.argv[1]
    out = []
    for (w, h), u in LAYOUTS:
        ab('set', 'viewport', str(w), str(h))
        for name, seed, steps in STATES:
            sh('go', seed)
            time.sleep(1.2)
            for kind, arg in steps:
                sh(kind, arg)
                time.sleep(1.0)
            if u:
                sh('u', u)
                time.sleep(0.4)
            m = json.loads(sh('measure'))
            # the check-in's sentence is in .nb-checkin-note; n26-measure reads every <p> in main that names the start
            out.append({'state': name, 'seed': seed, 'viewport': [w, h], 'nbUHeld': u, **m})
            print(locale, w, h, u or 'natural', name, '->', [(s['text'], s['height'], s['lines']) for s in m['sentences']],
                  m['distinctBarStarts'], file=sys.stderr)
    path = os.path.join(H, '..', f'n26-measurements-{locale}.json')
    with open(path, 'w') as f:
        json.dump({'measured_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'session': os.environ.get('AGENT_BROWSER_SESSION'),
                   'where': 'Chromium (agent-browser 0.38.1, headless) on WSL2; Vite dev build on 127.0.0.1:1477; history '
                            'answers from the real core (worktree src-tauri at 46dbf8e) over 127.0.0.1 HTTP, not Tauri IPC',
                   'readings': out}, f, indent=1, ensure_ascii=False)
    print(path, file=sys.stderr)


main()
