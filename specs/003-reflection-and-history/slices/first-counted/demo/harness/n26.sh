#!/bin/bash
# N26 helpers. AGENT_BROWSER_SESSION picks the browser (fc26us / fc26gb).
#   n26.sh go <seed>            open http://127.0.0.1:1477/?seed=<seed>
#   n26.sh click <text>         click the button whose words are exactly <text>
#   n26.sh range <from> [to]    set From (and To) through the input's own setter, as range.sh did
#   n26.sh u <1px|2px|natural>  hold --nb-u at a size on .nb-root, the [data-look] element that defines it, or give it back to the sheet
#   n26.sh measure              print n26-measure.js's reading
H=$(dirname "$0")
case "$1" in
  go) agent-browser open "http://127.0.0.1:1477/?seed=$2" >/dev/null ;;
  click) agent-browser eval "(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().toLowerCase()==='$2'.toLowerCase());if(!b)return 'no button $2';b.click();return 'clicked $2'})()" ;;
  range) agent-browser eval "(()=>{const ins=document.querySelectorAll('main input[type=date]');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;const put=(i,v)=>{set.call(i,v);i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))};if('$3')put(ins[1],'$3');put(ins[0],'$2');return [ins[0].value,ins[1].value]})()" ;;
  u) if [ "$2" = natural ]; then agent-browser eval "document.querySelector('.nb-root').style.removeProperty('--nb-u')"; else agent-browser eval "document.querySelector('.nb-root').style.setProperty('--nb-u','$2')"; fi ;;
  measure) agent-browser eval "$(cat "$H/n26-measure.js")" | python3 -c "import json,sys;print(json.dumps(json.loads(json.loads(sys.stdin.read())),indent=1,ensure_ascii=False))" ;;
esac
