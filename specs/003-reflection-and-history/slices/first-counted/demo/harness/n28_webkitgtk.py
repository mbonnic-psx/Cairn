#!/usr/bin/env python3
"""N28 in WebKitGTK, the engine Tauri's window uses on Linux (WebKit2 4.1 through PyGObject, run under xvfb-run).
Not the Tauri window itself: the same Vite page (127.0.0.1:1477) and the same real-core answers, in the same web
engine. Each state is measured as it is at 3d2882c and, for the two that matter, again with the list's
`nb-reaches-log--bars` class taken off in place (the flex rows N26 measured). Writes ../n28-webkitgtk-<label>.json
and n28-webkitgtk-<label>-*.png.

Usage: xvfb-run -a n28_webkitgtk.py <label> [preferred-language]   (no language: WebKitGTK's own default)
"""
import json, os, sys, time
import gi
gi.require_version('Gtk', '3.0')
gi.require_version('WebKit2', '4.1')
from gi.repository import Gtk, GLib, WebKit2

H = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(H, '..')
MEASURE = open(os.path.join(H, 'n28-measure.js')).read()
MEASURE_OFF = MEASURE.replace("document.querySelector('.nb-reaches-log--bars')", "document.querySelector('.n28-off')")
OFF = "(()=>{const l=document.querySelector('.nb-reaches-log--bars');if(!l)return 'none';l.classList.remove('nb-reaches-log--bars');l.classList.add('n28-off');return 'off'})()"
SCROLL_TO = "(()=>{const n=%s;const li=[...document.querySelectorAll('.nb-reaches-log li')].find(l=>l.querySelector('.nb-reaches-site')?.textContent===n);if(!li)return 'no row';li.scrollIntoView({block:'center'});return 'scrolled'})()"
label = sys.argv[1]
lang = sys.argv[2] if len(sys.argv) > 2 else None

ctx = WebKit2.WebContext.get_default()
if lang:
    ctx.set_preferred_languages([lang])
view = WebKit2.WebView.new_with_context(ctx)
win = Gtk.OffscreenWindow()
win.add(view)


def spin(ms):
    loop = GLib.MainLoop()
    GLib.timeout_add(ms, loop.quit)
    loop.run()


def js(code):
    box = {}
    loop = GLib.MainLoop()

    def done(v, res):
        try:
            box['v'] = v.run_javascript_finish(res).get_js_value().to_string()
        except Exception as e:  # noqa: BLE001 - recorded as the reading
            box['v'] = f'error: {e}'
        loop.quit()

    view.run_javascript(code, None, done)
    loop.run()
    return box['v']


def shot(path):
    # WebView.get_snapshot needs pycairo's foreign converter, which this computer lacks; the offscreen window's
    # own pixbuf is the same pixels.
    spin(300)
    try:
        win.get_pixbuf().savev(path, 'png', [], [])
        return True
    except Exception as e:  # noqa: BLE001
        return str(e)


def size(w, h):
    win.set_size_request(w, h)
    win.resize(w, h)
    view.set_size_request(w, h)
    win.show_all()
    spin(600)


def go(seed):
    view.load_uri(f'http://127.0.0.1:1477/?seed={seed}')
    spin(3000)


def click(text):
    return js("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().toLowerCase()==='%s');if(!b)return 'no button';b.click();return 'clicked'})()" % text)


def rng(first):
    return js("(()=>{const i=document.querySelectorAll('main input[type=date]')[0];const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,'%s');i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));return i.value})()" % first)


SINCE = ('range', '2025-01-01')
STATES = [
    ('c-daybyday-since2025', 'c', [('click', 'day by day'), SINCE], True),
    ('c-daybyday-default', 'c', [('click', 'day by day')], False),
    ('c-bysite-default', 'c', [('click', 'by site')], False),
    ('c-byhour-since2025', 'c', [('click', 'by hour'), SINCE], False),
    ('c-byday-since2025', 'c', [('click', 'by day'), SINCE], False),
    ('d-bysite-default', 'd', [('click', 'by site')], False),
    ('g-bysite-default', 'g', [('click', 'by site')], True),
    ('g-daybyday-default', 'g', [('click', 'day by day')], False),
]
SUMMARY = ['locale', 'navigatorLanguage', 'nbU', 'logDisplay', 'rowDisplay', 'supportsSubgrid', 'logColumns', 'countChars',
           'rowCount', 'underTwelveUnits', 'labelUnderTwelveUnits', 'minGap', 'barStart', 'barEnd', 'barWidth', 'countLeft',
           'distinctCountWidths', 'wrappedNames', 'rowsOverPage', 'maxOverPage', 'pageScrollsSideways', 'docScrollWidth']
out = {'measured_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
       'engine': f'WebKitGTK {WebKit2.get_major_version()}.{WebKit2.get_minor_version()}.{WebKit2.get_micro_version()} (WebKit2 4.1, PyGObject, Xvfb)',
       'preferred_language_set': lang, 'process_LANG': os.environ.get('LANG'), 'readings': [], 'screenshots': []}
for (w, h) in [(800, 600), (1280, 800)]:
    size(w, h)
    for key, seed, steps, compare in STATES:
        go(seed)
        for kind, arg in [('click', 'today'), ('click', 'over time'), *steps]:
            (click if kind == 'click' else rng)(arg)
            spin(1500)
        after = json.loads(js(MEASURE))
        rec = {'key': key, 'seed': seed, 'viewport': [w, h], 'after': {k: after.get(k) for k in SUMMARY},
               'rows': after.get('rows')}
        if key in ('c-daybyday-since2025', 'g-bysite-default'):
            if key.startswith('c-daybyday') and after.get('minGap'):
                js(SCROLL_TO % json.dumps(after['minGap']['name']))
                spin(400)
            name = f'n28-webkitgtk-{label}-{key}-{w}x{h}.png'
            rec['screenshot'] = name if shot(os.path.join(D, name)) is True else None
            out['screenshots'].append(name)
        if compare:
            js(OFF)
            spin(400)
            before = json.loads(js(MEASURE_OFF))
            rec['before_class_off'] = {k: before.get(k) for k in SUMMARY}
            rec['rowHeightsSame'] = [r['rowHeight'] for r in before['rows']] == [r['rowHeight'] for r in after['rows']]
            rec['nameLinesSame'] = [r['nameLines'] for r in before['rows']] == [r['nameLines'] for r in after['rows']]
        out['readings'].append(rec)
        a = rec['after']
        print(label, w, h, key, a['locale'], a['logDisplay'], 'rows', a['rowCount'], '<12', a['underTwelveUnits'], a['minGap'],
              'start', a['barStart'], 'end', a['barEnd'], 'over', a['rowsOverPage'], a['pageScrollsSideways'],
              '| before<12', rec.get('before_class_off', {}).get('underTwelveUnits'), rec.get('before_class_off', {}).get('minGap'),
              rec.get('before_class_off', {}).get('barStart'), file=sys.stderr)
with open(os.path.join(D, f'n28-webkitgtk-{label}.json'), 'w') as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
