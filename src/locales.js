'use strict';
const languages={ru:'Русский',en:'English',es:'Español',de:'Deutsch','pt-BR':'Português (Brasil)',fr:'Français'};
const locales={ru:'ru-RU',en:'en-US',es:'es-ES',de:'de-DE','pt-BR':'pt-BR',fr:'fr-FR'};
function resolve(value){const code=String(value||'').trim().replace(/_/g,'-').toLowerCase();const base=code.split('-')[0];if(base==='pt')return 'pt-BR';return Object.hasOwn(languages,base)?base:'en';}
function choose(manual,appLanguage){return Object.hasOwn(languages,manual)?manual:resolve(appLanguage);}
function text(strings,language,key){return strings[language]?.[key]||strings.en[key]||key;}
const formatters=new Map();
function formatDate(value,language){if(!value)return '';const locale=locales[language]||locales.en;let formatter=formatters.get(locale);if(!formatter){formatter=new Intl.DateTimeFormat(locale,{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'});formatters.set(locale,formatter);}const [y,m,d]=value.split('-').map(Number);const instant=new Date(0);instant.setUTCFullYear(y,m-1,d);instant.setUTCHours(12,0,0,0);return formatter.format(instant);}
module.exports={languages,locales,resolve,choose,text,formatDate};
