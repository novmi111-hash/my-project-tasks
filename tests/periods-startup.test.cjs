const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./mock.cjs'),C=require('../src/core');

test('cold vault cache: existing physical folders allow repeated initialization',async()=>{
 const s=setup();s.plugin.initialized=false;s.plugin.loadData=async()=>({...s.plugin.settings,tasksFolder:'Work/Tasks',projectsFolder:'Work/Projects'});
 s.vault.adapter={stat:async()=>({type:'folder'})};s.vault.getAbstractFileByPath=()=>null;
 s.vault.createFolder=async()=>{throw Error('Folder already exists.');};
 await s.plugin.initialize();assert.equal(s.plugin.initialized,true);await s.plugin.initialize();assert.equal(s.notices.length,0);
 assert.equal(s.plugin.settings.showWeek,false);assert.equal(s.plugin.settings.showMonth,false);
});
test('folder created concurrently is accepted after physical verification',async()=>{
 const s=setup();let exists=false,creates=0;s.vault.adapter={stat:async()=>exists?{type:'folder'}:null};
 s.vault.createFolder=async()=>{creates++;exists=true;throw Error('Folder already exists.');};
 await s.plugin.folder('Tasks');assert.equal(creates,1);
});
test('file collisions and real folder write failures remain errors',async()=>{
 const s=setup();s.vault.adapter={stat:async()=>({type:'file'})};await assert.rejects(s.plugin.folder('Tasks'));
 s.vault.adapter.stat=async()=>null;s.vault.createFolder=async()=>{throw Error('permission denied');};await assert.rejects(s.plugin.folder('Tasks'),/permission denied/);
});
test('retry button recovers failed initialization once storage becomes available',async()=>{
 const s=setup();s.plugin.initialized=false;s.plugin.loadData=async()=>({...s.plugin.settings});s.plugin.error=()=>{};
 const original=s.vault.createFolder;s.vault.createFolder=async()=>{throw Error('temporarily unavailable');};
 await s.plugin.initialize();assert.equal(s.plugin.initialized,false);
 const b=new s.views.Board({},s.plugin);await b.render();s.vault.createFolder=original;
 await b.containerEl.querySelector('button').onclick();assert.equal(s.plugin.initialized,true);assert.equal(b.board.querySelectorAll('.mpt-column').length,3);
});
test('period classification respects hidden columns, overdue tasks and completed tasks',()=>{
 const today='2026-10-07',both={showWeek:true,showMonth:true};
 for(const [date,want] of [['','backlog'],['2026-10-06','today'],[today,'today'],['2026-10-11','week'],['2026-10-12','month'],['2026-10-31','month'],['2026-11-01','backlog']])assert.equal(C.bucket({date},today,both),want);
 assert.equal(C.bucket({date:'2026-10-09'},today),'backlog');
 assert.equal(C.bucket({date:'2026-10-09'},today,{showMonth:true}),'month');
 assert.equal(C.bucket({date:'2026-10-12'},today,{showWeek:true}),'backlog');
 assert.equal(C.bucket({date:today,completed:true},today,both),'done');
});
test('period boundaries handle Sunday, leap February and weeks spanning a year',()=>{
 assert.equal(C.periodDate('week','2026-10-11'),'2026-10-11');
 assert.equal(C.periodDate('week','2026-12-31'),'2027-01-03');
 assert.equal(C.periodDate('month','2028-02-10'),'2028-02-29');
 assert.equal(C.periodDate('month','2026-12-31'),'2026-12-31');
 assert.equal(C.bucket({date:'2027-01-02'},'2026-12-31',{showWeek:true,showMonth:true}),'week');
});
test('moving to periods preserves deadline and recurrence schedule; undo restores exact raw',async()=>{
 const s=setup();Object.assign(s.plugin.settings,{showWeek:true,showMonth:true});
 const a=await s.add('A',{date:'2026-10-07',deadline:'2026-10-15',recurrence:'weekly'});
 await s.plugin.move(a.path,'week');let b=await s.plugin.entity(a.path);assert.equal(b.date,'2026-10-11');assert.equal(b.deadline,'2026-10-15');assert.equal(b.mptAnchor,'2026-10-07');
 const beforeMonth=b.raw;await s.plugin.move(a.path,'month');b=await s.plugin.entity(a.path);assert.equal(b.date,'2026-10-31');assert.equal(b.deadline,'2026-10-15');assert.equal(b.mptScheduled,'2026-10-07');
 await s.plugin.undo();assert.equal((await s.plugin.entity(a.path)).raw,beforeMonth);
});
test('reordering in Week does not replace the planned date with Sunday',async()=>{
 const s=setup();s.plugin.settings.showWeek=true;const a=await s.add('A',{date:'2026-10-08'}),b=await s.add('B',{date:'2026-10-09',sortOrder:2000});
 await s.plugin.move(a.path,'week',b.path,true);assert.equal((await s.plugin.entity(a.path)).date,'2026-10-08');
});
test('toggles persist independently and hidden periods regroup without editing files',async()=>{
 const s=setup();let saved,refresh=0;s.plugin.saveData=async x=>{saved={...x};};s.plugin.refreshViews=()=>{refresh++;};
 const a=await s.add('A',{date:'2026-10-09'}),b=new s.views.Board({},s.plugin);await b.render();assert.equal(b.board.querySelectorAll('.mpt-column').length,3);
 const settings=new s.views.Settings(s.plugin.app,s.plugin);settings.display();
 for(const key of ['showWeek','showMonth']){const row=s.settingRows.find(x=>x.name===s.plugin.t(key));assert.equal(row.value,false);await row.change(true);assert.equal(saved[key],true);}
 await b.render();assert.equal(b.board.querySelectorAll('.mpt-column').length,5);assert.equal(b.board.querySelector('.mpt-week').querySelectorAll('.mpt-card').length,1);
 s.plugin.settings.showWeek=false;await b.render();assert.equal(b.board.querySelector('.mpt-month').querySelectorAll('.mpt-card').length,1);
 assert.equal((await s.plugin.entity(a.path)).raw,a.raw);assert.equal(refresh,2);
});
