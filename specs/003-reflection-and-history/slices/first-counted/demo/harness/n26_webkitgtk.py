#!/usr/bin/env python3
"""N26 in WebKitGTK, the engine Tauri's window uses on Linux (WebKit2 4.1 through PyGObject, run under xvfb-run).
Not the Tauri window itself: the same Vite page (127.0.0.1:1477) and the same real-core answers, in the same web
engine. Writes ../n26-webkitgtk-<label>.json.

Usage: xvfb-run -a n26_webkitgtk.py <label> [preferred-language]   (no language: WebKitGTK's own default)
"""
import json, os, sys, time
import gi
gi.require_version('Gtk', '3.0')
gi.require_version('WebKit2', '4.1')
from gi.repository import Gtk, GLib, WebKit2

H = os.path.dirname(os.path.abspath(__file__))
MEASURE = open(os.path.join(H, 'n26-measure.js')).read()
V29 = open(os.path.join(H, 'n26-v29.js')).read()
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


STATES = [
    ('F2 Over time, By site (range does not hold the first count)', 'c', [('click', 'today'), ('click', 'over time')]),
    ('F3 Over time, Day by day, From 2025-01-01 (longest sentence; weekly rows, one over 999)', 'c',
     [('click', 'today'), ('click', 'over time'), ('click', 'day by day'), ('range', '2025-01-01')]),
    ('F3 Over time, By site, first count yesterday (no year)', 'd', [('click', 'today'), ('click', 'over time')]),
    ('Today on the first day', 'f', [('click', 'today')]),
    ('Check-in on the first day', 'f', [('click', 'tonight')]),
    ('Today the next day (no sentence expected)', 'd', [('click', 'today')]),
    ('Check-in the next day (no sentence expected)', 'd', [('click', 'tonight')]),
]

out = {'measured_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'engine': f'WebKitGTK {WebKit2.get_major_version()}.{WebKit2.get_minor_version()}.{WebKit2.get_micro_version()} (WebKit2 4.1, PyGObject, Xvfb)',
       'preferred_language_set': lang, 'process_LANG': os.environ.get('LANG'), 'readings': [], 'timing': {}}
for (w, h) in [(800, 600), (1280, 800)]:
    size(w, h)
    for name, seed, steps in STATES:
        go(seed)
        for kind, arg in steps:
            (click if kind == 'click' else rng)(arg)
            spin(1500)
        m = json.loads(js(MEASURE))
        out['readings'].append({'state': name, 'seed': seed, 'viewport': [w, h], **m})
        print(label, w, h, name, '->', m['locale'], [(s['text'], s['height'], s['lines']) for s in m['sentences']], m['distinctBarStarts'], file=sys.stderr)


def timed(seed, limit_s):
    size(1280, 800)
    go(seed)
    for t in ('today', 'over time', 'day by day'):
        click(t)
        spin(1500)
    t0 = time.monotonic()
    said = js(V29)
    while time.monotonic() - t0 < limit_s:
        spin(1000)
        r = json.loads(js("JSON.stringify({done:window.__done??null,gap:Math.round(window.__gap),rows:window.__rows??null,fromAfter:window.__fromAfter??null})"))
        if r['done'] is not None:
            r['said'] = said
            return r
    return {'said': said, 'done': None, 'note': f'not drawn within {limit_s} s'}


out['timing']['since-2025, From typed 1000-01-01'] = timed('c', 60)
print(label, 'timing c', out['timing']['since-2025, From typed 1000-01-01'], file=sys.stderr)
if lang is None:
    out['timing']['centuries-back (F6), From typed 1000-01-01'] = timed('e', 240)
    print(label, 'timing e', out['timing']['centuries-back (F6), From typed 1000-01-01'], file=sys.stderr)
with open(os.path.join(H, '..', f'n26-webkitgtk-{label}.json'), 'w') as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
