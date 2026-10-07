const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
class TFile{constructor(path){this.path=path;this.extension=path.split('.').pop();this.basename=path.split('/').pop().replace(/\.[^.]+$/,'');}}
function setup(config={}){
 const doc=require('./dom.cjs').document();const notices=[],entries=new Map(),folders=new Set(),events=new Map();let failCreate=null,failProcess=null;
 const settingRows=[],menus=[];
 class Setting{constructor(host){this.host=host;this.options={};settingRows.push(this);}setName(v){this.name=v;return this;}setDesc(v){this.desc=v;return this;}addDropdown(fn){const row=this;fn({addOption(k,v){row.options[k]=v;return this;},setValue(v){row.value=v;return this;},onChange(fn){row.change=fn;return this;}});return this;}addText(fn){const row=this;fn({setValue(v){row.value=v;return this;},onChange(fn){row.change=fn;return this;}});return this;}addButton(fn){const row=this;fn({setButtonText(v){row.buttonText=v;return this;},onClick(fn){row.click=fn;return this;}});return this;}}
 class Menu{constructor(){this.items=[];menus.push(this);}addItem(fn){const item={};fn({setTitle(v){item.title=v;return this;},onClick(fn){item.click=fn;return this;}});this.items.push(item);return this;}showAtMouseEvent(){}}
 const api={getLanguage:config.getLanguage,Plugin:class{},ItemView:class{constructor(leaf){this.containerEl=doc.createElement('div');this.containerEl.createEl('div');this.containerEl.createEl('div');doc.body.appendChild(this.containerEl);}},PluginSettingTab:class{constructor(){this.containerEl=doc.createElement("div");}},Setting,Modal:class{constructor(){this.contentEl=doc.createElement('div');doc.body.appendChild(this.contentEl);}open(){this.opened=true;return this.onOpen?.();}close(){this.opened=false;}},Notice:class{constructor(s){notices.push(s);}},Menu,TFile,normalizePath:s=>s.replace(/\/+/g,'/'),parseYaml:JSON.parse,stringifyYaml:x=>JSON.stringify(x,null,2)};
 const source=fs.readFileSync(path.join(__dirname,'../my-project-tasks/main.js'),'utf8');const sandbox={document:doc,navigator:{language:config.navigatorLanguage||'en'},window:{localStorage:{getItem:()=>{if(config.storageError)throw Error('blocked');return config.storedLanguage||null;}}},require:n=>{if(n==='obsidian')return api;throw Error(n)},module:{exports:{}},console,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto};vm.runInNewContext(source+'\nmodule.exports.__test={Board,TaskModal,ProjectModal,Settings};',sandbox);const Plugin=sandbox.module.exports,plugin=new Plugin();
 const fire=(event,file)=>{for(const fn of events.get(event)||[])fn(file);};
 const vault={
  on:(event,fn)=>{if(!events.has(event))events.set(event,[]);events.get(event).push(fn);},
  getAbstractFileByPath:p=>entries.get(p)?.file||(folders.has(p)?{path:p}:null),
  getMarkdownFiles:()=>[...entries.values()].map(x=>x.file).filter(x=>x.extension==='md'),
  read:async file=>{if(!entries.has(file.path))throw Error('not found');return entries.get(file.path).raw;},
  createFolder:async p=>{folders.add(p);},
  create:async(p,raw)=>{if(failCreate?.(p)){failCreate=null;throw Error('simulated create failure');}if(entries.has(p))throw Error('exists');const file=new TFile(p);entries.set(p,{file,raw});fire('create',file);return file;},
  process:async(file,fn)=>{if(failProcess?.(file.path)){failProcess=null;throw Error('simulated write failure');}const row=entries.get(file.path);row.raw=fn(row.raw);fire('modify',file);return row.raw;}
 };
 plugin.app={vault,workspace:{getLeavesOfType:()=>[]},metadataCache:{getFileCache:f=>{try{return{frontmatter:parse(entries.get(f.path).raw)}}catch{return {}}}},fileManager:{trashFile:async f=>{entries.delete(f.path);fire('delete',f);}}};
 plugin.settings={tasksFolder:'Tasks',projectsFolder:'Projects',defaultPriority:'medium',freeLanguage:'en'};plugin.cache=new Map();plugin.queue=Promise.resolve();plugin.reported=new Set();plugin.initialized=true;plugin.today=()=> '2026-10-07';plugin.refreshViews=()=>{};plugin.ready=Promise.resolve();
 for(const event of ['create','modify','delete'])vault.on(event,f=>plugin.cache.delete(f.path));
 function parse(raw){return JSON.parse(raw.match(/^---\n([\s\S]*?)\n---\n/)[1]);}
 async function add(name,fm,body='Description\n'){const file=await vault.create('Tasks/'+name+'.md','---\n'+JSON.stringify({type:'task',title:name,...fm})+'\n---\n'+body);return plugin.entity(file.path);}
 return {plugin,vault,entries,doc,settingRows,menus,views:Plugin.__test,notices,add,parse,failNextCreate:fn=>failCreate=fn,failNextProcess:fn=>failProcess=fn};
}
module.exports={setup};
