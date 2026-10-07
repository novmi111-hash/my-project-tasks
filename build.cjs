const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
let main=fs.readFileSync(path.join(root,'src/plugin.js'),'utf8');
for(const name of ['core','i18n','locales']){const src=fs.readFileSync(path.join(root,`src/${name}.js`),'utf8');main=main.replace(`require('./${name}')`,`(()=>{const module={exports:{}};\n${src}\nreturn module.exports;})()`);}
fs.writeFileSync(path.join(root,'my-project-tasks/main.js'),main);
