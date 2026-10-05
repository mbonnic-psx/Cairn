#!/bin/bash
# range.sh <from> <to> : set the two date boxes as a person would, through the input's own setter
export AGENT_BROWSER_SESSION=hm12
agent-browser eval "(()=>{const ins=document.querySelectorAll('input[type=date]');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(ins[0],'$1');ins[0].dispatchEvent(new Event('input',{bubbles:true}));ins[0].dispatchEvent(new Event('change',{bubbles:true}));set.call(ins[1],'$2');ins[1].dispatchEvent(new Event('input',{bubbles:true}));ins[1].dispatchEvent(new Event('change',{bubbles:true}));set.call(ins[0],'$1');ins[0].dispatchEvent(new Event('input',{bubbles:true}));ins[0].dispatchEvent(new Event('change',{bubbles:true}));return [ins[0].value,ins[1].value]})()"
