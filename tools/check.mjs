/** Zero-dependency source and asset-integrity checks. No GPU is involved. */
import {readFile,readdir,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {ROOT} from './vendor.mjs';
let checked=0,failed=false;
for(const dir of ['src','tools','tests'])for(const entry of await readdir(path.join(ROOT,dir))){
 if(!/\.(m?js)$/.test(entry))continue;
 const file=path.join(ROOT,dir,entry),result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 if(result.status!==0){console.error(result.stderr);failed=true;}checked++;
 const code=await readFile(file,'utf8');
 for(const [,relative] of code.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){
  try{await stat(path.resolve(path.dirname(file),relative));}catch{console.error(`Missing import in ${dir}/${entry}: ${relative}`);failed=true;}
 }
}
const html=await readFile(path.join(ROOT,'index.html'),'utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length){console.error('Duplicate HTML id');failed=true;}
for(const [,relative]of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(/^(https?:|data:)/.test(relative))continue;try{await stat(path.join(ROOT,relative));}catch{console.error(`Missing HTML asset: ${relative}`);failed=true;}}
console.log(`${checked} JavaScript modules parsed; imports and HTML asset paths checked.`);
if(failed)process.exitCode=1;
