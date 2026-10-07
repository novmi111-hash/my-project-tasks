class Element {
 constructor(tag='div',doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.dataset={};this.style={};this.attributes={};this.value='';this.scrollTop=0;this._text='';this.classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x),toggle:(x,on)=>{if(on===undefined)on=!this.classes.has(x);on?this.classes.add(x):this.classes.delete(x);}};}
 createEl(tag,opts={}){const e=new Element(tag,this.ownerDocument);if(opts.cls)e.classList.add(...opts.cls.split(' ').filter(Boolean));if(opts.text!==undefined)e.textContent=opts.text;this.appendChild(e);return e;}
 appendChild(e){this.children.push(e);e.parentElement=this;return e;}empty(){this.children=[];this._text='';}addClass(c){this.classList.add(c);}setAttribute(k,v){this.attributes[k]=v;}get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}set textContent(v){this._text=String(v);this.children=[];}focus(){this.ownerDocument.activeElement=this;}setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}
 querySelectorAll(selector){const parts=selector.split(',').map(x=>x.trim());const match=e=>parts.some(s=>s.startsWith('.')?e.classes.has(s.slice(1)):e.tagName.toLowerCase()===s);const out=[];for(const c of this.children){if(match(c))out.push(c);out.push(...c.querySelectorAll(selector));}return out;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}closest(s){if(s.split(',').some(x=>x.startsWith('.')?this.classes.has(x.slice(1)):this.tagName.toLowerCase()===x))return this;return this.parentElement?.closest(s)||null;}
 getBoundingClientRect(){return{top:0,height:100};}
}
function document(){const d={activeElement:null,hidden:false};d.body=new Element('body',d);d.createElement=tag=>new Element(tag,d);d.querySelectorAll=s=>d.body.querySelectorAll(s);return d;}
module.exports={Element,document};
