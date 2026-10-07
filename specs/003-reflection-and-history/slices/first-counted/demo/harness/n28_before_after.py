#!/usr/bin/env python3
"""N28: the same page measured twice, as it is and with the list's `nb-reaches-log--bars` class taken off in place
(which gives back the flex rows N26 measured, since every N28 rule hangs on that class). So the before and after
are the same answers, the same fonts and the same window. Writes ../n28-chromium-before-after-<locale>.json.

Usage: AGENT_BROWSER_SESSION=fc28us n28_before_after.py en-US
"""
import json, os, subprocess, sys, time

H = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(H, '..')
SH = os.path.join(H, 'n26.sh')
MEASURE = open(os.path.join(H, 'n28-measure.js')).read()
OFF = "(()=>{const l=document.querySelector('.nb-reaches-log--bars');if(!l)return 'none';l.classList.remove('nb-reaches-log--bars');l.classList.add('n28-off');return 'off'})()"
MEASURE_OFF = MEASURE.replace("document.querySelector('.nb-reaches-log--bars')", "document.querySelector('.n28-off')")


def ab(*a):
    return subprocess.run(['agent-browser', *a], capture_output=True, text=True).stdout.strip()


def sh(*a):
    return subprocess.run([SH, *a], capture_output=True, text=True).stdout.strip()


SINCE = ('range', '2025-01-01')
STATES = [
    ('c-daybyday-since2025', 'c', [('click', 'day by day'), SINCE]),
    ('c-bysite-default', 'c', [('click', 'by site')]),
    ('c-byhour-since2025', 'c', [('click', 'by hour'), SINCE]),
    ('c-byday-since2025', 'c', [('click', 'by day'), SINCE]),
    ('d-bysite-default', 'd', [('click', 'by site')]),
    ('g-bysite-default', 'g', [('click', 'by site')]),
]
KEEP = ['logDisplay', 'rowCount', 'underTwelveUnits', 'labelUnderTwelveUnits', 'minGap', 'barStart', 'barEnd', 'barWidth',
        'countLeft', 'wrappedNames', 'rowsOverPage', 'maxOverPage', 'pageScrollsSideways']
locale = sys.argv[1]
out = []
for (w, h) in [(800, 600), (1280, 800)]:
    ab('set', 'viewport', str(w), str(h))
    for key, seed, steps in STATES:
        sh('go', seed)
        time.sleep(1.2)
        for kind, arg in [('click', 'today'), ('click', 'over time'), *steps]:
            sh(kind, arg)
            time.sleep(1.0)
        time.sleep(0.8)
        after = json.loads(json.loads(ab('eval', MEASURE)))
        ab('eval', OFF)
        time.sleep(0.4)
        before = json.loads(json.loads(ab('eval', MEASURE_OFF)))
        if key == 'g-bysite-default' and w == 800:
            ab('screenshot', os.path.join(D, f'n28-g-bysite-default-{locale}-800x600-class-off.png'))
        heights = lambda m: [r['rowHeight'] for r in m['rows']]
        rec = {'key': key, 'viewport': [w, h], 'after': {k: after[k] for k in KEEP}, 'before': {k: before[k] for k in KEEP},
               'rowHeightsSame': heights(after) == heights(before),
               'nameLinesSame': [r['nameLines'] for r in after['rows']] == [r['nameLines'] for r in before['rows']]}
        out.append(rec)
        print(locale, w, key, 'before<12', before['underTwelveUnits'], before['minGap'], before['barStart'], before['barWidth'],
              '| after<12', after['underTwelveUnits'], after['barStart'], after['barWidth'], 'heightsSame', rec['rowHeightsSame'],
              'linesSame', rec['nameLinesSame'], file=sys.stderr)
with open(os.path.join(D, f'n28-chromium-before-after-{locale}.json'), 'w') as f:
    json.dump({'measured_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'session': os.environ.get('AGENT_BROWSER_SESSION'),
               'how': 'after = the page at 3d2882c; before = the same page with nb-reaches-log--bars removed in place',
               'readings': out}, f, indent=1, ensure_ascii=False)
