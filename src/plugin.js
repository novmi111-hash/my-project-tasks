'use strict';
const {Plugin,ItemView,PluginSettingTab,Setting,Modal,Notice,Menu,TFile,normalizePath,parseYaml,stringifyYaml,getLanguage}=require('obsidian');
const C=require('./core');
const STRINGS=require('./i18n');
const L=require('./locales');
const VIEW='my-project-tasks-view';
const BACKUP='MyProjectTasksBackups/Free-2.2.0';
const DEFAULTS={tasksFolder:'Tasks',projectsFolder:'Projects',defaultPriority:'medium',freeLanguage:'auto'};
function split(raw) {
 const m=/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(raw);
 if(!m) return {fm:{},body:raw};
 const fm=parseYaml(m[1]);
 if(!fm || typeof fm!=='object' || Array.isArray(fm)) throw Object.assign(Error('Invalid YAML frontmatter'),{mptKey:'invalidYaml'});
 return {fm,body:raw.slice(m[0].length)};
}
function encode(fm,body='') { return `---\n${stringifyYaml(fm).trimEnd()}\n---\n${body}`; }
function el(host,tag,cls,text) {return host.createEl(tag,{...(cls?{cls}:{}),...(text!==undefined?{text:String(text)}:{})});}
function button(host,text,fn,cls='mpt-btn') {const b=el(host,'button',cls,text);b.type='button';b.onclick=fn;return b;}
function options(select,values,current) {for(const [v,label] of values){const o=el(select,'option','',label);o.value=v;}select.value=current||'';return select;}
function labelInput(host,label,tag='input',type='text') {const row=el(host,'label','mpt-field');el(row,'span','',label);const inp=el(row,tag);if(tag==='input')inp.type=type;return inp;}

class Confirm extends Modal {
 constructor(plugin,title,message,action){super(plugin.app);Object.assign(this,{plugin,title,message,action});}
 onOpen(){const c=this.contentEl;c.empty();el(c,'h2','',this.title);el(c,'p','',this.message);const a=el(c,'div','mpt-actions');button(a,this.plugin.t('cancel'),()=>this.close());const b=button(a,this.plugin.t('delete'),()=>this.plugin.run(async()=>{b.disabled=true;try{await this.action();this.close();}finally{b.disabled=false;}}),'mpt-btn mod-warning');}
}
class TaskModal extends Modal {
 constructor(plugin,task=null,initial={}){super(plugin.app);Object.assign(this,{plugin,task,initial});}
 async onOpen(){await this.plugin.run(async()=>{
  const p=this.plugin,t=k=>p.t(k); await p.ready;
  const c=this.contentEl;c.empty();c.addClass('mpt-task-modal');el(c,'h2','',this.task?t('edit'):t('newTask'));
  const projects=await p.loadProjects(),task=this.task||this.initial;
  const title=labelInput(c,t('title'));title.value=task.title||'';
  const project=labelInput(c,t('project'),'select');const pairs=[['',t('noProject')],...projects.map(x=>[C.key(x.path),x.title])];
  if(task.project&&!pairs.some(x=>x[0]===C.key(task.project))) pairs.push([C.key(task.project),C.key(task.project)]);
  options(project,pairs,C.key(task.project));
  const date=labelInput(c,t('date'),'input','date');date.value=task.date||'';
  const priority=labelInput(c,t('priority'),'select');options(priority,['high','medium','low'].map(x=>[x,t(x)]),task.priority||p.settings.defaultPriority);
  const rec=labelInput(c,t('recurrence'),'select');const rp=C.RECURRENCES.map(x=>[x,t(x)]);if(task.recurrence&&!C.RECURRENCES.includes(task.recurrence))rp.push([task.recurrence,task.recurrence]);options(rec,rp,task.recurrence||'none');
  rec.disabled=!!task.completed;el(c,'p','mpt-help',task.completed?t('readOnlyHistory'):t('repeatHint'));
  const desc=labelInput(c,t('description'),'textarea');desc.rows=5;desc.value=task.body||'';
  el(c,'h3','',t('checklist'));const subhost=el(c,'div','mpt-sub-editor');let subs=(task.subtasks||[]).map(x=>({...x}));
  const renderSubs=()=>{subhost.empty();subs.forEach((s,i)=>{const row=el(subhost,'div','mpt-sub-row');const cb=el(row,'input');cb.type='checkbox';cb.checked=s.done;cb.setAttribute('aria-label',s.text||t('checklist'));cb.onchange=()=>s.done=cb.checked;
    const inp=el(row,'input');inp.type='text';inp.value=s.text;inp.setAttribute('aria-label',t('checklist'));inp.oninput=()=>s.text=inp.value;
    const up=button(row,'↑',()=>{[subs[i-1],subs[i]]=[subs[i],subs[i-1]];renderSubs();});up.disabled=i===0;up.title=t('moveUp');
    const down=button(row,'↓',()=>{[subs[i+1],subs[i]]=[subs[i],subs[i+1]];renderSubs();});down.disabled=i===subs.length-1;down.title=t('moveDown');
    const del=button(row,'×',()=>{subs.splice(i,1);renderSubs();});del.title=t('removeItem');});};renderSubs();button(c,t('addItem'),()=>{subs.push({text:'',done:false});renderSubs();});
  const a=el(c,'div','mpt-actions');button(a,t('cancel'),()=>this.close());
  const save=button(a,t('save'),()=>p.run(async()=>{
   if(!title.value.trim())return new Notice(t('titleRequired'));
   if(date.value&&!C.date(date.value))return new Notice(t('badDate'));
   if(rec.value!=='none'&&!date.value&&(!this.task||rec.value!==this.task.recurrence))return new Notice(t('dateRequired'));
   save.disabled=true;
   try {await p.saveTask(this.task,{title:title.value.trim(),project:project.value?`[[${project.value}]]`:'',date:date.value,priority:priority.value,recurrence:rec.value,subtasks:subs.filter(x=>x.text.trim()).map(x=>({...x,text:x.text.trim()}))},desc.value);this.close();p.refreshViews();}finally{save.disabled=false;}
  }),'mpt-btn mod-cta');title.focus();
 });}
}
class ProjectModal extends Modal {
 constructor(plugin,project=null){super(plugin.app);Object.assign(this,{plugin,project});}
 onOpen(){const p=this.plugin,t=k=>p.t(k),c=this.contentEl;c.empty();el(c,'h2','',this.project?t('edit'):t('newProject'));
  const name=labelInput(c,t('title'));name.value=this.project?.title||'';
  const color=labelInput(c,t('color'),'input','color');color.value=/^#[0-9a-f]{6}$/i.test(this.project?.color)?this.project.color:'#4f46e5';
  const desc=labelInput(c,t('description'),'textarea');desc.rows=5;desc.value=this.project?.body||'';
  const a=el(c,'div','mpt-actions');button(a,t('cancel'),()=>this.close());const save=button(a,t('save'),()=>p.run(async()=>{if(!name.value.trim())return new Notice(t('titleRequired'));save.disabled=true;try{await p.saveProject(this.project,{name:name.value.trim(),color:color.value},desc.value);this.close();p.refreshViews();}finally{save.disabled=false;}}),'mpt-btn mod-cta');name.focus();
 }
}
class Board extends ItemView {
 constructor(leaf,plugin){super(leaf);this.plugin=plugin;this.mode='tasks';this.filter={search:'',project:'',sort:'manual'};this.doneLimit=50;this.collapsed={};this.seq=0;}
 getViewType(){return VIEW;}getDisplayText(){return 'My Project Tasks Free';}getIcon(){return 'check-square';}
 async onOpen(){await this.render();}
 async onClose(){clearTimeout(this.searchTimer);this.seq++;}
 async render(){const seq=++this.seq;try{
  await this.plugin.ready;if(!this.plugin.initialized)throw Error(this.plugin.t('initialError'));
  await this.plugin.recover();const [tasks,projects]=await Promise.all([this.plugin.loadTasks(),this.plugin.loadProjects()]);if(seq!==this.seq)return;
  this.tasks=tasks;this.projects=projects;const root=this.containerEl.children[1];
  const active=root.ownerDocument.activeElement,focus=active?.classList.contains('mpt-search'),pos=focus?active.selectionStart:null;
  const scrolls=Array.from(root.querySelectorAll('.mpt-column-body')).map(x=>x.scrollTop);root.empty();root.addClass('mpt-root');const t=k=>this.plugin.t(k);
  const top=el(root,'div','mpt-topbar');for(const mode of ['tasks','projects'])button(top,t(mode),()=>{this.mode=mode;this.render();},`mpt-btn ${this.mode===mode?'mod-cta':''}`);
  el(top,'span','mpt-version',`Free ${C.VERSION}`);button(top,t('newTask'),()=>new TaskModal(this.plugin).open(),'mpt-btn mod-cta');
  this.content=el(root,'div','mpt-content');if(this.mode==='projects')this.renderProjects();else{this.renderFilters();this.board=el(this.content,'div','mpt-board');this.renderBoard();}
  root.querySelectorAll('.mpt-column-body').forEach((x,i)=>x.scrollTop=scrolls[i]||0);
  if(focus){const s=root.querySelector('.mpt-search');s?.focus();try{s?.setSelectionRange(pos,pos);}catch{}}
 }catch(e){this.plugin.error(e);const root=this.containerEl.children[1];root.empty();el(root,'p','mpt-error',this.plugin.t('error'));button(root,this.plugin.t('retry'),()=>this.render());}}
 renderFilters(){const t=k=>this.plugin.t(k),bar=el(this.content,'div','mpt-toolbar');
  const search=el(bar,'input','mpt-search');search.type='search';search.placeholder=t('search');search.setAttribute('aria-label',t('search'));search.value=this.filter.search;search.oninput=()=>{this.filter.search=search.value;this.doneLimit=50;clearTimeout(this.searchTimer);this.searchTimer=setTimeout(()=>this.renderBoard(),100);};
  const pr=el(bar,'select');pr.setAttribute('aria-label',t('project'));options(pr,[['',t('allProjects')],['__none',t('noProject')],...this.projects.map(p=>[C.key(p.path),p.title])],this.filter.project);pr.onchange=()=>{this.filter.project=pr.value;this.doneLimit=50;this.renderBoard();};
  const sort=el(bar,'select');sort.setAttribute('aria-label',t('manual'));options(sort,[['manual',t('manual')],['date',t('byDate')],['priority',t('byPriority')]],this.filter.sort);sort.onchange=()=>{this.filter.sort=sort.value;this.renderBoard();};
 }
 filtered(){const q=this.filter.search.trim().toLocaleLowerCase();return this.tasks.filter(x=>(!q||`${x.title} ${x.body} ${x.subtasks.map(s=>s.text).join(' ')}`.toLocaleLowerCase().includes(q))&&(!this.filter.project||(this.filter.project==='__none'?!x.project:C.key(x.project)===this.filter.project)));}
 ordered(items,list){return [...items].sort((a,b)=>{
  if(list==='done')return String(b.completedAt||b.archivedAt||'').localeCompare(String(a.completedAt||a.archivedAt||''))||(b.sortOrder-a.sortOrder);
  if(this.filter.sort==='date')return (a.date||'9999').localeCompare(b.date||'9999')||a.sortOrder-b.sortOrder;
  if(this.filter.sort==='priority'){const rank={high:0,medium:1,low:2};return rank[a.priority]-rank[b.priority]||a.sortOrder-b.sortOrder;}
  return a.sortOrder-b.sortOrder||a.title.localeCompare(b.title);
 });}
 renderBoard(){if(!this.board)return;this.board.empty();const t=k=>this.plugin.t(k),today=this.plugin.today(),tasks=this.filtered();
  for(const list of ['backlog','today','done']){
   const items=this.ordered(tasks.filter(x=>C.bucket(x,today)===list),list),col=el(this.board,'section',`mpt-column mpt-${list}`);
   const head=el(col,'div','mpt-column-head');el(head,'h3','',t(list));el(head,'span','mpt-count',items.length);
   if(list!=='done')button(head,'+',()=>new TaskModal(this.plugin,null,{date:list==='today'?today:''}).open()).setAttribute('aria-label',t('newTask'));
   const body=el(col,'div','mpt-column-body');body.dataset.list=list;this.drop(body,list);
   if(!items.length)el(body,'p','mpt-empty',t('empty'));
   if(list==='today'){
    for(const [group,label] of [['overdue',t('overdue')],['planned',t('planned')]]){
     const members=items.filter(x=>group==='overdue'?x.date<today:x.date===today);if(!members.length)continue;
     const groupBtn=button(body,`${this.collapsed[group]?'▸':'▾'} ${label} (${members.length})`,()=>{this.collapsed[group]=!this.collapsed[group];this.renderBoard();},'mpt-group');groupBtn.setAttribute('aria-expanded',String(!this.collapsed[group]));
     if(!this.collapsed[group])for(const task of members)this.card(body,task,list);
    }
   }else {for(const task of items.slice(0,list==='done'?this.doneLimit:undefined))this.card(body,task,list);if(list==='done'&&items.length>this.doneLimit)button(body,t('showMore'),()=>{this.doneLimit+=50;this.renderBoard();});}
  }
 }
 drop(node,list,target=null){node.ondragover=e=>{if(e.dataTransfer?.types?.includes('text/mpt-task')){e.preventDefault();e.stopPropagation();node.classList.add('mpt-dragover');}};node.ondragleave=()=>node.classList.remove('mpt-dragover');
  node.ondrop=e=>{e.preventDefault();e.stopPropagation();node.classList.remove('mpt-dragover');const path=e.dataTransfer.getData('text/mpt-task');if(!path||path===target?.path)return;
   this.plugin.run(async()=>{if(this.filter.sort!=='manual'&&target&&C.bucket(target,this.plugin.today())===C.bucket(this.tasks.find(x=>x.path===path)||{},this.plugin.today()))return new Notice(this.plugin.t('dragSorted'));
    await this.plugin.move(path,list,target?.path,e.clientY>node.getBoundingClientRect().top+node.getBoundingClientRect().height/2);await this.render();});};}
 card(host,task,list){const p=this.plugin,t=k=>p.t(k),card=el(host,'article',`mpt-card${task.completed?' is-completed':''}${!task.completed&&task.date&&task.date<p.today()?' is-overdue':''}`);
  const project=this.projects.find(x=>C.key(x.path)===C.key(task.project));card.style.borderLeftColor=project?.color||'#64748b';card.draggable=true;card.ondragstart=e=>{if(e.target.closest('button,input,select,a')){e.preventDefault();return;}e.dataTransfer.setData('text/mpt-task',task.path);e.dataTransfer.effectAllowed='move';};this.drop(card,list,task);
  button(card,task.title,()=>new TaskModal(p,task).open(),'mpt-card-title');
  const meta=el(card,'div','mpt-meta');if(project)el(meta,'span','',project.title);else if(task.project)el(meta,'span','',C.key(task.project));
  el(meta,'span',`mpt-priority mpt-priority-${task.priority}`,t(task.priority));if(task.date)el(meta,'span','',p.formatDate(task.date));
  if(task.completedAt&&task.completed)el(meta,'span','',`${t('completedAt')}: ${p.formatDate(task.completedAt)}`);
  if(task.recurrence!=='none')el(meta,'span','',`↻ ${C.RECURRENCES.includes(task.recurrence)?t(task.recurrence):task.recurrence}`);
  if(task.archived)el(meta,'span','',t('archived'));if(task.mptNextPending)el(card,'p','mpt-error',t('pendingRepair'));
  if(task.subtasks.length){el(card,'div','mpt-meta',`${task.subtasks.filter(x=>x.done).length} / ${task.subtasks.length}`);for(const [i,s] of task.subtasks.slice(0,3).entries()){const row=el(card,'label','mpt-check');const cb=el(row,'input');cb.type='checkbox';cb.checked=s.done;cb.onchange=()=>p.run(()=>p.toggleSubtask(task.path,i,cb.checked));el(row,'span','',s.text);}}
  const a=el(card,'div','mpt-card-actions');if(!task.completed)button(a,'✓',()=>p.run(()=>p.move(task.path,'done'))).setAttribute('aria-label',t('complete'));
  if(task.completed)button(a,t('restore'),()=>p.run(()=>p.restore(task.path)));
  else if(list!=='today')button(a,t('toToday'),()=>p.run(()=>p.move(task.path,'today')));
  button(a,'⋯',e=>this.taskMenu(e,task)).setAttribute('aria-label',t('menu'));
  card.oncontextmenu=e=>{e.preventDefault();this.taskMenu(e,task);};
 }
 taskMenu(event,task){const p=this.plugin,t=k=>p.t(k),m=new Menu();const add=(name,fn)=>m.addItem(x=>x.setTitle(t(name)).onClick(()=>p.run(fn)));
  add('edit',()=>new TaskModal(p,task).open());if(task.completed)add('restore',()=>p.restore(task.path));else{add('complete',()=>p.move(task.path,'done'));add('toToday',()=>p.move(task.path,'today'));add('toBacklog',()=>p.move(task.path,'backlog'));add('plusDay',()=>p.shiftDay(task.path));}
  add('openNote',()=>p.app.workspace.openLinkText(task.path,'',false));if(task.source)add('openSource',()=>p.openSource(task));add('delete',()=>p.confirmDeleteTask(task));m.showAtMouseEvent(event);
 }
 renderProjects(){const p=this.plugin,t=k=>p.t(k);button(this.content,t('newProject'),()=>new ProjectModal(p).open(),'mpt-btn mod-cta');const grid=el(this.content,'div','mpt-project-grid');if(!this.projects.length)el(grid,'p','',t('noProjects'));
  for(const project of this.projects){const card=el(grid,'article','mpt-project-card');card.style.borderTopColor=project.color||'#4f46e5';button(card,project.title,()=>{this.mode='tasks';this.filter.project=C.key(project.path);this.render();},'mpt-card-title');
   const tasks=this.tasks.filter(x=>C.key(x.project)===C.key(project.path));el(card,'p','mpt-meta',`${t('countOpen')}: ${tasks.filter(x=>!x.completed).length} · ${t('countDone')}: ${tasks.filter(x=>x.completed).length}`);
   const a=el(card,'div','mpt-actions');button(a,t('edit'),()=>new ProjectModal(p,project).open());button(a,t('delete'),()=>p.confirmDeleteProject(project));}
 }
}
class Settings extends PluginSettingTab {
 constructor(app,plugin){super(app,plugin);this.plugin=plugin;}
 display(){const p=this.plugin,t=k=>p.t(k),c=this.containerEl;c.empty();el(c,'h2','',`My Project Tasks Free ${C.VERSION}`);
  new Setting(c).setName(t('language')).addDropdown(d=>{d.addOption('auto',t('auto'));for(const [code,name] of Object.entries(L.languages))d.addOption(code,name);d.setValue(p.settings.freeLanguage).onChange(v=>p.run(async()=>{p.settings.freeLanguage=v;await p.saveData(p.settings);p.updateCommandLabels();this.display();p.refreshViews();}));});
  let tasks=p.settings.tasksFolder,projects=p.settings.projectsFolder;
  new Setting(c).setName(t('taskFolder')).addText(x=>x.setValue(tasks).onChange(v=>tasks=v));new Setting(c).setName(t('projectFolder')).addText(x=>x.setValue(projects).onChange(v=>projects=v));
  new Setting(c).setDesc(t('foldersDesc')).addButton(x=>x.setButtonText(t('apply')).onClick(()=>p.run(async()=>{const a=p.validFolder(tasks),b=p.validFolder(projects);if(!a||!b||a===b||a.startsWith(b+'/')||b.startsWith(a+'/'))throw Error(t('invalidFolder'));await p.folder(a);await p.folder(b);p.settings.tasksFolder=a;p.settings.projectsFolder=b;await p.saveData(p.settings);p.cache.clear();p.refreshViews();})));
  el(c,'p','mpt-help',t('offline'));el(c,'p','mpt-help',t('backup'));
 }
}
class MyProjectTasksFree extends Plugin {
 onload(){this.settings={...DEFAULTS};this.cache=new Map();this.queue=Promise.resolve();this.initialized=false;this._day=C.iso();this.reported=new Set();
  this.registerView(VIEW,leaf=>new Board(leaf,this));this.addRibbonIcon('check-square','My Project Tasks Free',()=>this.run(()=>this.open()));
  this.openCommand=this.addCommand({id:'open-my-project-tasks',name:this.t('openCommand'),callback:()=>this.run(()=>this.open())});
  this.newTaskCommand=this.addCommand({id:'new-project-task',name:this.t('newTaskCommand'),callback:()=>this.run(async()=>{await this.ready;new TaskModal(this).open();})});this.addSettingTab(new Settings(this.app,this));
  for(const event of ['create','modify','delete','rename'])this.registerEvent(this.app.vault.on(event,(file,oldPath)=>{this.cache.delete(file.path);if(oldPath)this.cache.delete(oldPath);this.scheduleRefresh();}));
  this.registerInterval(window.setInterval(()=>this.checkDay(),30000));this.registerDomEvent(document,'visibilitychange',()=>{if(!document.hidden)this.checkDay();});this.registerDomEvent(window,'focus',()=>this.checkDay());
  this.ready=this.initialize();this.app.workspace.onLayoutReady(()=>this.run(async()=>{await this.ready;await this.recover();this.refreshViews();}));
 }
 async initialize(){try{const stored=await this.loadData()||{};this.settings={...DEFAULTS,...stored};if(!['auto',...Object.keys(L.languages)].includes(this.settings.freeLanguage))this.settings.freeLanguage='auto';
  for(const field of ['tasksFolder','projectsFolder'])if(!this.validFolder(this.settings[field]))throw Error(this.t('invalidFolder'));
  const a=this.settings.tasksFolder,b=this.settings.projectsFolder;if(a===b||a.startsWith(b+'/')||b.startsWith(a+'/'))throw Error(this.t('invalidFolder'));await this.folder(a);await this.folder(b);this.initialized=true;this.updateCommandLabels();
 }catch(e){this.error(e);}}
 onunload(){clearTimeout(this.refreshTimer);for(const leaf of this.app.workspace.getLeavesOfType(VIEW))clearTimeout(leaf.view?.searchTimer);}
 appLanguage(){
  try{if(typeof getLanguage==='function'){const language=getLanguage();if(language)return language;}}catch{}
  try{const language=window.localStorage.getItem('language');if(language)return language;}catch{}
  try{return navigator.language||'en';}catch{return 'en';}
 }
 lang(){return L.choose(this.settings.freeLanguage,this.appLanguage());}
 t(k){return L.text(STRINGS,this.lang(),k);}
 updateCommandLabels(){if(this.openCommand)this.openCommand.name=this.t('openCommand');if(this.newTaskCommand)this.newTaskCommand.name=this.t('newTaskCommand');}
 today(){return C.iso();}formatDate(s){const d=C.date(s);return d?L.formatDate(d,this.lang()):'';}
 error(e){console.error('My Project Tasks Free:',e);new Notice(`${this.t('error')}: ${e?.mptKey?this.t(e.mptKey):e?.message||e}`,8000);}
 async run(fn){try{return await fn();}catch(e){this.error(e);}}
 serial(fn){const work=this.queue.then(fn);this.queue=work.catch(()=>{});return work;}
 checkDay(){const now=this.today();if(now!==this._day){this._day=now;this.refreshViews();}}
 scheduleRefresh(){clearTimeout(this.refreshTimer);this.refreshTimer=setTimeout(()=>this.refreshViews(),180);}
 refreshViews(){for(const leaf of this.app.workspace.getLeavesOfType(VIEW))leaf.view?.render?.();}
 async open(){await this.ready;let leaf=this.app.workspace.getLeavesOfType(VIEW)[0];if(!leaf){leaf=this.app.workspace.getLeaf(false);await leaf.setViewState({type:VIEW,active:true});}await this.app.workspace.revealLeaf(leaf);return leaf.view;}
 validFolder(path){const s=String(path||'').trim().replace(/\\/g,'/').replace(/\/+$/,'');if(!s||s.startsWith('/')||s.split('/').some(x=>!x||x==='..'||x==='.'||x.startsWith('.'))||/[:*?"<>|]/.test(s)||s.startsWith('MyProjectTasksBackups'))return '';return normalizePath(s);}
 async folder(path){let current='';for(const part of path.split('/')){current=current?`${current}/${part}`:part;const existing=this.app.vault.getAbstractFileByPath(current);if(existing instanceof TFile)throw Error(this.t('folderExists'));if(!existing)try{await this.app.vault.createFolder(current);}catch(e){if(!this.app.vault.getAbstractFileByPath(current))throw e;}}}
 async read(file,fresh=false){if(!file||!(file instanceof TFile))throw Error(this.t('fileNotFound'));if(!fresh&&this.cache.has(file.path))return this.cache.get(file.path);
  const raw=await this.app.vault.read(file),{fm,body}=split(raw),record={...C.normalize(fm,file.path,body),fm,raw};this.cache.set(file.path,record);return record;}
 async entity(path){const f=this.app.vault.getAbstractFileByPath(path);return this.read(f,true);}
 async load(type){const files=this.app.vault.getMarkdownFiles().filter(f=>!f.path.startsWith('MyProjectTasksBackup'));
  const out=[];let index=0;const worker=async()=>{while(index<files.length){const file=files[index++];const prefix=(type==='task'?this.settings.tasksFolder:this.settings.projectsFolder)+'/';const fm=this.app.metadataCache.getFileCache(file)?.frontmatter;
   if(!file.path.startsWith(prefix)&&fm?.type!==type)continue;
   try{const e=await this.read(file);if(e.fm.type===type)out.push(e);}catch(e){if(!this.reported.has(file.path)){this.reported.add(file.path);new Notice(`${this.t('readError')}: ${file.path}${e.mptKey?' — '+this.t(e.mptKey):''}`,8000);}console.error(e);}}};await Promise.all(Array.from({length:8},worker));return out;}
 loadTasks(){return this.load('task');}loadProjects(){return this.load('project').then(xs=>xs.sort((a,b)=>a.title.localeCompare(b.title)));}
 async backup(record){let hash=14695981039346656037n;for(const char of record.path){hash^=BigInt(char.codePointAt(0));hash=BigInt.asUintN(64,hash*1099511628211n);}const base=`${BACKUP}/${hash.toString(16)}.json`;const existing=this.app.vault.getAbstractFileByPath(base);if(existing){const saved=JSON.parse(await this.app.vault.read(existing));if(saved.originalPath!==record.path)throw Error(this.t('backupConflict'));return;}await this.folder(BACKUP);await this.app.vault.create(base,JSON.stringify({originalPath:record.path,createdAt:new Date().toISOString(),content:record.raw},null,2));}
 async write(record,changes,body){await this.backup(record);const file=this.app.vault.getAbstractFileByPath(record.path);if(!(file instanceof TFile))throw Error(this.t('fileNotFound'));
  await this.app.vault.process(file,raw=>{if(raw!==record.raw)throw Error(this.t('conflict'));const current=split(raw);return encode({...current.fm,...changes},body===undefined?current.body:body);});this.cache.delete(record.path);return this.entity(record.path);}
 async create(type,values,body=''){const folder=type==='task'?this.settings.tasksFolder:this.settings.projectsFolder;await this.folder(folder);let path=`${folder}/${C.safeName(values.title||values.name)}.md`,n=2;while(this.app.vault.getAbstractFileByPath(path))path=`${folder}/${C.safeName(values.title||values.name)} (${n++}).md`;
  const fm={type,id:C.id(),createdAt:this.today(),...values};await this.app.vault.create(path,encode(fm,body));return this.entity(path);}
 async saveTask(original,values,body){return this.serial(async()=>{let old=original?await this.entity(original.path):null;if(old&&old.raw!==original.raw)throw Error(this.t('conflict'));
  const changes={...values,updatedAt:this.today()};if(!old){Object.assign(changes,{completed:false,archived:false,sortOrder:Date.now(),listId:C.bucket(changes,this.today())});}
  if(values.recurrence!=='none'&&(!old||old.recurrence!==values.recurrence||(!old.mptAnchor&&!old.date))){changes.mptAnchor=values.date;changes.mptScheduled=values.date;changes.mptSeriesId=C.id();changes.mptNextId='';}
  else if(old?.recurrence!=='none'&&values.recurrence!=='none'){changes.mptAnchor=old.mptAnchor||old.date||values.date;changes.mptScheduled=old.mptScheduled||old.date||values.date;}
  if(old){changes.id=old.id||C.id();if(!old.completed)changes.listId=C.bucket({...old,...changes},this.today());await this.write(old,changes,body);}else await this.create('task',changes,body);
  this.refreshViews();});}
 async saveProject(original,values,body){return this.serial(async()=>{if(original){const old=await this.entity(original.path);if(old.raw!==original.raw)throw Error(this.t('conflict'));await this.write(old,{...values,id:old.id||C.id()},body);}else await this.create('project',values,body);this.refreshViews();});}
 async toggleSubtask(path,index,done){return this.serial(async()=>{const old=await this.entity(path);const subtasks=old.subtasks.map(x=>({...x}));if(!subtasks[index])return;subtasks[index].done=done;await this.write(old,{subtasks,updatedAt:this.today()});this.refreshViews();});}
 async complete(old){if(old.completed)return;if(old.recurrence!=='none'&&!C.RECURRENCES.includes(old.recurrence))throw Error(this.t('legacyRepeat'));
  const changes={id:old.id||C.id(),completed:true,completedAt:this.today(),listId:'done',sortOrder:Date.now(),updatedAt:this.today()};
  if(old.recurrence!=='none'){
   const nextId=C.id(),next=C.nextOccurrence(old,this.today()),series=old.mptSeriesId||changes.id;
   changes.mptAnchor=old.mptAnchor||old.mptScheduled||old.date||this.today();changes.mptScheduled=old.mptScheduled||old.date||changes.mptAnchor;changes.mptSeriesId=series;changes.mptNextId=nextId;
   changes.mptNextPending={id:nextId,date:next,path:`${this.settings.tasksFolder}/${C.safeName(old.title)} -- ${nextId}.md`};
  }
  const completed=await this.write(old,changes);if(changes.mptNextPending)await this.ensureNext(completed);
 }
 async ensureNext(parent){const pending=parent.fm.mptNextPending;if(!pending)return;
  const existing=this.app.vault.getAbstractFileByPath(pending.path);if(existing){const record=await this.read(existing,true);if(record.id!==pending.id)throw Error(this.t('recurrenceConflict'));}
  else {await this.folder(pending.path.split('/').slice(0,-1).join('/'));
   const fm={...parent.fm,id:pending.id,completed:false,completedAt:'',date:pending.date,listId:'backlog',archived:false,archivedAt:'',mptScheduled:pending.date,mptNextId:'',mptNextPending:null,mptPreviousId:parent.id,subtasks:parent.subtasks.map(x=>({...x,done:false})),createdAt:this.today(),updatedAt:this.today(),sortOrder:Date.now()};
   await this.app.vault.create(pending.path,encode(fm,parent.body));
  }
  const current=await this.entity(parent.path);await this.write(current,{mptNextPending:null});
 }
 async recover(){if(!this.initialized)return;if(this.recovering)return this.recovering;
  this.recovering=this.serial(async()=>{const tasks=await this.loadTasks();for(const t of tasks.filter(x=>x.completed&&x.mptNextPending)){try{await this.ensureNext(await this.entity(t.path));}catch(e){if(!this.reported.has('pending:'+t.path)){this.reported.add('pending:'+t.path);new Notice(this.t('pendingError'),8000);}console.error(e);}}});
  try{await this.recovering;}finally{this.recovering=null;}
 }
 async move(path,target,targetPath=null,after=false){return this.serial(async()=>{let old=await this.entity(path);const current=C.bucket(old,this.today());
  if(target==='done'&&!old.completed){await this.complete(old);this.refreshViews();return;}
  const changes=C.movement(old,target,this.today());if(old.completed&&old.mptNextPending)await this.ensureNext(old);
  old=await this.entity(path);
  if(old.completed&&target!=='done'&&old.mptNextId)new Notice(this.t('restoredOnce'));
  const tasks=await this.loadTasks(),items=tasks.filter(x=>x.path!==path&&C.bucket(x,this.today())===target).sort((a,b)=>a.sortOrder-b.sortOrder);
  let order=(items.at(-1)?.sortOrder||0)+1000;
  if(targetPath){const i=items.findIndex(x=>x.path===targetPath);if(i>=0){const at=i+(after?1:0),left=items[at-1]?.sortOrder,right=items[at]?.sortOrder;order=left===undefined?(right||0)-1000:right===undefined?left+1000:(left+right)/2;
   if(left!==undefined&&right!==undefined&&(order===left||order===right||left===right)){for(let n=0;n<items.length;n++){const r=await this.entity(items[n].path);await this.write(r,{sortOrder:(n+1)*1000});}order=at*1000+500;}}}
  const preserveSchedule=old.recurrence!=='none'?{mptAnchor:old.mptAnchor||old.date||this.today(),mptScheduled:old.mptScheduled||old.date||this.today()}:{};
  await this.write(old,{...preserveSchedule,...changes,...(current!==target?{listId:target}:{}),sortOrder:order,updatedAt:this.today()});this.refreshViews();});}
 async restore(path){return this.serial(async()=>{let old=await this.entity(path);if(old.mptNextPending){await this.ensureNext(old);old=await this.entity(path);}if(!old.completed&&!old.archived)return;
  const changes=C.movement(old,'',this.today(),true);await this.write(old,{...changes,listId:C.bucket({...old,...changes},this.today()),updatedAt:this.today()});if(old.mptNextId)new Notice(this.t('restoredOnce'));this.refreshViews();});}
 async shiftDay(path){return this.serial(async()=>{const old=await this.entity(path);const base=C.asDate(old.date&&old.date>this.today()?old.date:this.today());base.setDate(base.getDate()+1);const date=C.iso(base);
  await this.write(old,{date,listId:'backlog',...(old.recurrence!=='none'?{mptAnchor:old.mptAnchor||old.date||this.today(),mptScheduled:old.mptScheduled||old.date||this.today()}:{}),updatedAt:this.today()});this.refreshViews();});}
 async openSource(task){const path=C.key(task.source),file=this.app.metadataCache.getFirstLinkpathDest(path,task.path);if(!file)return new Notice(this.t('linkMissing'));await this.app.workspace.openLinkText(file.path,task.path,false);}
 confirmDeleteTask(task){new Confirm(this,this.t('deleteTask'),`${task.title}\n${this.t('deleteInfo')}`,()=>this.serial(async()=>{let old=await this.entity(task.path);if(old.mptNextPending){await this.ensureNext(old);old=await this.entity(task.path);}await this.backup(old);await this.app.fileManager.trashFile(this.app.vault.getAbstractFileByPath(task.path));this.cache.delete(task.path);this.refreshViews();})).open();}
 async confirmDeleteProject(project){await this.run(async()=>{const tasks=(await this.loadTasks()).filter(x=>C.key(x.project)===C.key(project.path));new Confirm(this,this.t('deleteProject'),`${project.title}\n${this.t('projectDeleteInfo')}${tasks.length}`,()=>this.serial(async()=>{const current=await this.entity(project.path);await this.backup(current);const related=(await this.loadTasks()).filter(x=>C.key(x.project)===C.key(project.path));for(const task of related)await this.write(await this.entity(task.path),{project:'',updatedAt:this.today()});await this.app.fileManager.trashFile(this.app.vault.getAbstractFileByPath(project.path));this.cache.delete(project.path);this.refreshViews();})).open();});}
}
module.exports=MyProjectTasksFree;
