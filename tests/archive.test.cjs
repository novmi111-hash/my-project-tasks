const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./mock.cjs');
test('archive and unarchive retain dates, completion, recurrence, body and unknown fields; undo restores exact raw',async()=>{
 for(const completed of [false,true]){const s=setup(),a=await s.add('A',{completed,completedAt:completed?'2026-10-06':'',date:'2026-10-07',deadline:'2026-10-12',recurrence:'weekly',custom:'keep'},'Original body');
 await s.plugin.setArchived(a.path,true);const archived=await s.plugin.entity(a.path);assert.equal(archived.archived,true);assert.equal(archived.archivedAt,'2026-10-07');
 await s.plugin.undo();assert.equal((await s.plugin.entity(a.path)).raw,a.raw);
 await s.plugin.setArchived(a.path,true);await s.plugin.setArchived(a.path,false);const restored=await s.plugin.entity(a.path);for(const k of ['completed','completedAt','date','deadline','recurrence','custom','body'])assert.deepEqual(restored[k],a[k]);assert.equal(restored.archived,false);assert.equal((await s.plugin.loadTasks()).length,1);}
});
test('archive is excluded from board and calendar, searchable and restorable without reopening completion',async()=>{
 const s=setup(),a=await s.add('Archived',{date:'2026-10-07',completed:true});await s.add('Active',{date:'2026-10-07'});await s.plugin.setArchived(a.path,true);
 const b=new s.views.Board({},s.plugin);await b.render();assert.equal(b.board.querySelectorAll('.mpt-card').length,1);
 b.mode='calendar';b.hideCompleted=false;await b.render();assert.equal(b.calendar.querySelectorAll('.mpt-calendar-task').length,1);
 b.mode='archive';await b.render();assert.equal(b.archive.querySelectorAll('.mpt-card').length,1);assert.equal(b.archive.querySelector('.mpt-card').draggable,false);
 b.filter.search='absent';b.renderResults();assert.equal(b.archive.querySelectorAll('.mpt-card').length,0);b.filter.search='Archived';b.renderResults();
 await b.archive.querySelectorAll('button').find(x=>x.textContent===s.plugin.t('unarchive')).onclick();assert.equal((await s.plugin.entity(a.path)).completed,true);await b.render();assert.equal(b.archive.querySelectorAll('.mpt-card').length,0);
});
test('archiving a recurring completed instance leaves its successor and history unchanged',async()=>{
 const s=setup(),a=await s.add('Series',{date:'2026-10-07',recurrence:'daily'});await s.plugin.move(a.path,'done');const next=(await s.plugin.loadTasks()).find(x=>!x.completed),before=await s.plugin.entity(a.path);
 await s.plugin.setArchived(a.path,true);await s.plugin.recover();await s.plugin.setArchived(a.path,false);assert.equal((await s.plugin.loadTasks()).length,2);assert.equal((await s.plugin.entity(next.path)).raw,next.raw);assert.equal((await s.plugin.entity(a.path)).mptNextId,before.mptNextId);
});
test('archive menus and legacy archived tasks are accessible in all six languages',async()=>{
 for(const lang of ['ru','en','es','de','pt-BR','fr']){const s=setup();s.plugin.settings.freeLanguage=lang;const a=await s.add('Legacy',{archived:true,completed:true}),b=new s.views.Board({},s.plugin);b.mode='archive';await b.render();assert.equal(b.archive.querySelectorAll('.mpt-card').length,1);b.taskMenu({},a);assert.ok(s.menus.at(-1).items.some(x=>x.title===s.plugin.t('unarchive')));assert.ok(!s.menus.at(-1).items.some(x=>x.title===s.plugin.t('complete')));}
});
