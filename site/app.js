/* Progress is published from one versioned JSON file; visitors never change shared state. */
'use strict';
const STATUS = {done:'已完成',doing:'进行中',blocked:'待落实',unverified:'待核实',todo:'待开始'};
const $ = (selector, parent = document) => parent.querySelector(selector);
const el = (tag, className, text) => {const node = document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const state = {status:'all',stage:'all',search:''};
let data;
let taskById;
let stageById;
const badge = status => el('span',`badge status-${status}`,STATUS[status]);
const link = (label, href, className) => {const a=el('a',className,label);a.href=href;return a;};

function showTask(id) {
  const task=taskById.get(id);
  if(!task)return;
  resetFilters(false);
  const row=document.getElementById(`task-${id}`);
  row.open=true;
  row.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
  $('summary',row).focus({preventScroll:true});
}

function renderStages() {
  const grid=$('#stage-grid');grid.replaceChildren();
  for(const stage of data.stages){
    const tasks=data.tasks.filter(t=>t.stage===stage.id);
    const done=tasks.filter(t=>t.status==='done').length;
    const button=el('button',`stage${state.stage===stage.id?' selected':''}`);
    button.type='button';button.dataset.stage=stage.id;
    button.setAttribute('aria-pressed',String(state.stage===stage.id));
    button.setAttribute('aria-label',`${stage.name}，${done}项已完成，共${tasks.length}项。筛选对应任务`);
    button.append(el('span','stage-number',`${stage.number} /`),el('span','stage-name',stage.name),el('span','stage-desc',stage.description),el('span','stage-meta',`${done} / ${tasks.length} 项已完成`));
    const line=el('span','stage-line');line.setAttribute('aria-hidden','true');const fill=el('span');fill.style.width=`${done/tasks.length*100}%`;line.append(fill);button.append(line);
    button.addEventListener('click',()=>{state.stage=stage.id;state.status='all';state.search='';$('#task-search').value='';$('#stage-select').value=stage.id;renderTasks();$('#tasks').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});$('#stage-select').focus({preventScroll:true});});
    grid.append(button);
  }
}

function renderGates(){
  const pending=data.gates.filter(g=>taskById.get(g.taskId).status!=='done').length;
  $('#gate-count').textContent=pending?`${pending} 项待落实`:'启动条件已落实';
  $('#gate-summary').textContent=pending?`${pending} 项启动条件待落实`:'查看正式筛查启动条件';
  for(const [i,gate] of data.gates.entries()){
    const article=el('article','gate');const top=el('div','gate-top');top.append(el('span','gate-number',`0${i+1}`),badge(taskById.get(gate.taskId).status));
    const a=link('查看对应任务 ↗',`#task-${gate.taskId}`);
    a.addEventListener('click',e=>{e.preventDefault();showTask(gate.taskId);});
    article.append(top,el('h3','',gate.title),el('p','',gate.description),a);$('#gate-grid').append(article);
  }
}

function detail(label,text,className){const box=el('div',className);box.append(el('span','detail-label',label),el('p','',text));return box;}

function taskRow(task){
  const row=el('details','task');row.id=`task-${task.id}`;
  const summary=el('summary');summary.append(badge(task.status),el('span','task-title',task.title),el('span','task-stage',stageById.get(task.stage).name),el('span','task-role',task.role));const chevron=el('span','task-chevron','›');chevron.setAttribute('aria-hidden','true');summary.append(chevron);
  const body=el('div','task-detail');
  body.append(detail('下一步',task.next),detail('完成标准',task.acceptance));
  body.append(detail('材料依据',`${task.evidence} 参考：${task.sources.map(id=>data.sources.find(s=>s.id===id).label).join('、')}。`,'evidence'));
  if(task.dependsOn?.length){
    const deps=el('div','dependencies');deps.append(el('span','detail-label','前置任务'));
    for(const id of task.dependsOn){const dep=taskById.get(id);const button=el('button',`dependency${dep.status==='done'?' done':''}`,`${STATUS[dep.status]} · ${dep.title}`);button.type='button';button.addEventListener('click',()=>showTask(id));deps.append(button);}
    body.append(deps);
  }
  const completion=detail('阶段出口',stageById.get(task.stage).exit);body.append(completion,detail('计划责任角色',task.role));
  row.append(summary,body);return row;
}

function renderTasks(){
  const q=state.search.trim().toLocaleLowerCase('zh-CN');
  const matching=data.tasks.filter(t=>(state.status==='all'||t.status===state.status)&&(state.stage==='all'||t.stage===state.stage)&&(!q||[t.title,t.role,t.next,t.acceptance,t.evidence,stageById.get(t.stage).name].join(' ').toLocaleLowerCase('zh-CN').includes(q)));
  // Resolve urgent prerequisites first; keep stable source order within each group.
  const order={blocked:0,unverified:1,doing:2,todo:3,done:4};
  matching.sort((a,b)=>order[a.status]-order[b.status]||Number(b.priority==='high')-Number(a.priority==='high'));
  $('#task-list').replaceChildren(...matching.map(taskRow));
  $('#task-list').hidden=matching.length===0;$('#empty-state').hidden=matching.length!==0;
  $('#task-result').textContent=`显示 ${matching.length} / ${data.tasks.length} 项任务${state.stage!=='all'?` · ${stageById.get(state.stage).name}`:''}`;
  $('#reset-filters').hidden=state.status==='all'&&state.stage==='all'&&!state.search;
  for(const button of document.querySelectorAll('.filter')){const active=button.dataset.status===state.status;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));const candidates=data.tasks.filter(t=>state.stage==='all'||t.stage===state.stage);$('span',button).textContent=button.dataset.status==='all'?candidates.length:candidates.filter(t=>t.status===button.dataset.status).length;}
  renderStages();
}

function resetFilters(focus=true){state.status='all';state.stage='all';state.search='';$('#task-search').value='';$('#stage-select').value='all';renderTasks();if(focus)document.querySelector('.filter').focus();}

function render(){
  const p=data.project;taskById=new Map(data.tasks.map(t=>[t.id,t]));stageById=new Map(data.stages.map(s=>[s.id,s]));
  $('#program').textContent=p.program;$('#project-subtitle').textContent=p.subtitle;$('#project-summary').textContent=p.summary;$('#status-note').textContent=p.statusNote;
  $('#focus-title').textContent=p.focusTitle;$('#focus-label').textContent=p.focusLabel;
  const route=$('.focus-route');route.replaceChildren();
  p.focusSteps.forEach((step,index)=>{if(index){const arrow=el('b','','→');arrow.setAttribute('aria-hidden','true');route.append(arrow);}route.append(el(step.current?'strong':'span','',step.label));});
  $('#snapshot').textContent=`页面整理 ${p.updatedAt} · 材料核实截至 ${p.evidenceAsOf}`;
  $('#metric-phase').textContent=p.phase;$('#metric-period').textContent=p.period;$('#metric-period-note').textContent=p.periodNote;
  const metric=$('#metric-tasks');metric.append(document.createTextNode(`${data.tasks.filter(t=>t.status==='done').length} `),el('em','',`/ ${data.tasks.length} 项`));
  for(const a of document.querySelectorAll('.repo-link'))a.href=p.repository;
  for(const a of document.querySelectorAll('.edit-link'))a.href=`${p.repository}/edit/main/site/data/progress.json`;
  for(const stage of data.stages){const option=el('option','',stage.name);option.value=stage.id;$('#stage-select').append(option);}
  renderGates();renderTasks();
  for(const m of data.milestones){const article=el('article','milestone');article.append(el('span','',m.period),el('h3','',m.title),el('p','',m.description));$('#milestone-grid').append(article);}
  for(const u of [...data.updates].sort((a,b)=>b.date.localeCompare(a.date))){const li=el('li','update');const top=el('div','update-top');const time=el('time','',u.date);time.dateTime=u.date;top.append(time,el('span','',u.type));li.append(top,el('h3','',u.title),el('p','',u.description));$('#update-list').append(li);}
  for(const source of data.sources)$('#source-list').append(el('li','',`${source.label}：${source.note}`));
  document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{state.status=button.dataset.status;renderTasks();}));
  $('#stage-select').addEventListener('change',e=>{state.stage=e.target.value;renderTasks();});
  $('#task-search').addEventListener('input',e=>{state.search=e.target.value;renderTasks();});
  $('#reset-filters').addEventListener('click',()=>resetFilters());$('#empty-reset').addEventListener('click',()=>resetFilters());
  $('#export-data').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=link('',url);a.download=`control-effort-progress_${p.updatedAt}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  $('#loading').hidden=true;$('#content').hidden=false;
  if(location.hash.startsWith('#task-'))showTask(location.hash.slice(6));
}

fetch('./data/progress.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error(`Progress HTTP ${response.status}`);return response.json();}).then(json=>{data=json;render();}).catch(error=>{console.error('Progress loading failed:',error);$('#loading').hidden=true;$('#content').hidden=true;$('#load-error').hidden=false;});
