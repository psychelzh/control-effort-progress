import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(await readFile(resolve(root,'site/data/progress.json'),'utf8'));
const isoDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value).toISOString().slice(0,10)===value;
assert.equal(data.schemaVersion,1);
assert(isoDate(data.project.updatedAt)&&isoDate(data.project.evidenceAsOf));
assert(data.project.evidenceAsOf<=data.project.updatedAt,'Evidence cannot be newer than page update');
assert.match(data.project.repository,/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/);
assert(data.project.focusTitle&&data.project.focusLabel);
assert.equal(data.project.focusSteps.filter(s=>s.current).length,1,'Exactly one current focus step is required');
const unique=(rows,label)=>{const ids=new Set(rows.map(x=>x.id));assert.equal(ids.size,rows.length,`${label}: duplicate ID`);assert(rows.every(x=>/^[a-z][a-z0-9-]*$/.test(x.id)),`${label}: invalid ID`);return ids;};
const stages=unique(data.stages,'stages'),sources=unique(data.sources,'sources'),tasks=unique(data.tasks,'tasks');unique(data.gates,'gates');
const statuses=new Set(['done','doing','blocked','unverified','todo']);
const byId=new Map(data.tasks.map(t=>[t.id,t]));
for(const t of data.tasks){
  assert(stages.has(t.stage),`Unknown stage: ${t.id}`);assert(statuses.has(t.status),`Unknown status: ${t.id}`);
  for(const key of ['title','role','next','acceptance','evidence'])assert(typeof t[key]==='string'&&t[key].trim(),`${t.id}: missing ${key}`);
  assert(t.sources.length&&t.sources.every(x=>sources.has(x)),`Unknown source: ${t.id}`);
  assert(['high','normal'].includes(t.priority));
  for(const id of t.dependsOn||[]){assert(tasks.has(id)&&id!==t.id,`Bad dependency: ${t.id}`);if(t.status==='done')assert.equal(byId.get(id).status,'done',`Completed task has incomplete dependency: ${t.id}`);}
}
const visit=(id,path=new Set())=>{assert(!path.has(id),`Dependency cycle at ${id}`);const next=new Set(path).add(id);for(const dep of byId.get(id).dependsOn||[])visit(dep,next);};
for(const t of data.tasks)visit(t.id);
for(const gate of data.gates)assert(tasks.has(gate.taskId),'Gate must reference an actual task');
for(const stage of data.stages)assert(data.tasks.some(t=>t.stage===stage.id),`Empty stage: ${stage.id}`);
for(const update of data.updates)assert(isoDate(update.date)&&update.date<=data.project.updatedAt,'Invalid update date');
// Upload boundary: the only deployable content is the explicitly reviewed static site.
async function walk(folder){const out=[];for(const e of await readdir(folder,{withFileTypes:true})){assert(!e.isSymbolicLink(),'No symlinks in deployment');if(e.isDirectory())out.push(...await walk(resolve(folder,e.name)));else out.push(resolve(folder,e.name));}return out;}
const allowed=new Set(['index.html','styles.css','app.js','favicon.svg','.nojekyll','data/progress.json']);
const files=await walk(resolve(root,'site'));
assert.equal(files.length,allowed.size,'Unexpected deployable file count');
for(const file of files){const relative=file.slice(resolve(root,'site').length+1).replaceAll('\\','/');assert(allowed.has(relative),`Unexpected deployable file: ${relative}`);const text=await readFile(file,'utf8');assert(!/(?:C:\\Users\\|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|\b1[3-9]\d{9}\b)/.test(text),`Potential private data in ${relative}`);}
const html=await readFile(resolve(root,'site/index.html'),'utf8');
assert.match(html,/<html lang="zh-CN">/);assert.match(html,/name="viewport"/);
const localRefs=[...html.matchAll(/(?:href|src)="\.\/([^"#]+)"/g)].map(m=>m[1]);
for(const ref of localRefs)assert(allowed.has(ref),`Broken local asset: ${ref}`);
console.log(`Validated ${data.stages.length} stages, ${data.tasks.length} tasks, ${data.gates.length} gates and ${files.length} public files.`);
