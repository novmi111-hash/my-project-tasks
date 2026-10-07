'use strict';
const VERSION = '2.2.1';
const RECURRENCES = ['none', 'daily', 'weekly', 'monthly'];
const pad = n => String(n).padStart(2, '0');
function iso(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function date(value) {
  if (value instanceof Date) return iso(value);
  const s = String(value || '').slice(0,10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return '';
  const d = new Date(+m[1], +m[2]-1, +m[3], 12);
  return iso(d) === s ? s : '';
}
function asDate(s) { const [y,m,d]=date(s).split('-').map(Number); return new Date(y,m-1,d,12); }
function key(v) {
  const s=String(v?.path || v || '').trim();
  const m=/^\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]$/.exec(s);
  return (m ? m[1] : s).replace(/\.md$/i,'');
}
function yes(v) { return v === true || v === 'true'; }
function normalize(fm, path, body='') {
  const completed=fm.completed === undefined ? (!!fm.completedAt || fm.stage==='done') : yes(fm.completed);
  return {...fm, path, body, title:String(fm.title || fm.name || path.split('/').pop().replace(/\.md$/,'')),
    date:date(fm.date || fm.planned), completed, completedAt:date(fm.completedAt) || (completed ? date(fm.date) : ''),
    archived:yes(fm.archived), recurrence:fm.recurrence || 'none', project:fm.project || '',
    priority:['high','medium','low'].includes(fm.priority)?fm.priority:'medium',
    sortOrder:Number(fm.sortOrder)||0,
    subtasks:Array.isArray(fm.subtasks)?fm.subtasks.map(x=>typeof x==='string'?{text:x,done:false}:{...x,text:String(x?.text||''),done:yes(x?.done)}):[]};
}
function bucket(task, today=iso()) { return task.completed ? 'done' : task.date && task.date<=today ? 'today' : 'backlog'; }
function nextOccurrence(task, today=iso()) {
  const rec=task.recurrence;
  if (!RECURRENCES.includes(rec) || rec==='none') return '';
  const scheduled=date(task.mptScheduled) || date(task.date) || date(task.mptAnchor) || today;
  const anchor=date(task.mptAnchor) || scheduled;
  const threshold=scheduled>today?scheduled:today;
  const base=asDate(anchor), end=asDate(threshold);
  if (rec==='monthly') {
    let months=(end.getFullYear()-base.getFullYear())*12+end.getMonth()-base.getMonth();
    months=Math.max(0,months);
    const at=n=>{const d=new Date(base.getFullYear(),base.getMonth()+n,1,12);d.setDate(Math.min(base.getDate(),new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return iso(d);};
    while(at(months)<=threshold) months++;
    return at(months);
  }
  const interval=rec==='weekly'?7:1;
  const utc=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
  const days=Math.round((utc(end)-utc(base))/86400000);
  const steps=Math.max(1,Math.floor(days/interval)+1);
  base.setDate(base.getDate()+steps*interval);
  return iso(base);
}
function movement(task, target, today=iso(), restore=false) {
  if(restore) return {completed:false,completedAt:'',archived:false,archivedAt:'',...(task.mptNextId?{recurrence:'none'}:{})};
  if(bucket(task,today)===target) return {};
  if(target==='done') return {completed:true,completedAt:today};
  return {completed:false,completedAt:'',date:target==='today'?today:'',archived:false,archivedAt:'',
    ...(task.completed&&task.mptNextId?{recurrence:'none'}:{})};
}
function safeName(s) {return String(s||'Task').replace(/[\\/:*?"<>|#^[\]]/g,'-').replace(/\s+/g,' ').replace(/[. ]+$/,'').slice(0,100)||'Task';}
function id() {return globalThis.crypto?.randomUUID?.() || `mpt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;}
module.exports={VERSION,RECURRENCES,iso,date,asDate,key,yes,normalize,bucket,nextOccurrence,movement,safeName,id};
