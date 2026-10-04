#!/bin/bash
# rows.sh : the right page as text, one line per row, plus the heading and the sentences
export AGENT_BROWSER_SESSION=hm12
agent-browser eval "(()=>{const h=document.querySelector('main h2')?.textContent;const ps=[...document.querySelectorAll('main p, .nb-reaches-empty')].map(p=>p.textContent);const lis=[...document.querySelectorAll('main li')].map(l=>[...l.childNodes].map(n=>n.textContent).filter(Boolean).join(' | '));return JSON.stringify({heading:h,sentences:ps,rows:lis.length,list:lis},null,1)})()" | python3 -c "import json,sys;print(json.loads(sys.stdin.read()))"
