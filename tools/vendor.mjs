/** Fetch the exact MIT-licensed Three.js build. No npm install or credentials needed. */
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function installVendor({quiet=false}={}){
  const target=path.join(ROOT,'vendor');await mkdir(target,{recursive:true});
  const files=['three.module.js','three.core.js'];
  for(const name of files){
    const destination=path.join(target,name);
    try{const old=await readFile(destination,'utf8');if(old.length>10000&&!old.trimStart().startsWith('<'))continue;}catch{}
    let data=null;
    try{const packageInfo=JSON.parse(await readFile(path.join(ROOT,'node_modules/three/package.json'),'utf8'));if(packageInfo.version==='0.180.0')data=await readFile(path.join(ROOT,'node_modules/three/build',name),'utf8');}catch{}
    if(!data){
      if(!quiet)console.log(`Fetching Three.js 0.180.0: ${name}`);
      const urls=[`https://cdn.jsdelivr.net/npm/three@0.180.0/build/${name}`,`https://unpkg.com/three@0.180.0/build/${name}`,`https://raw.githubusercontent.com/mrdoob/three.js/r180/build/${name}`];
      const failures=[];
      for(const url of urls){try{const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);const text=await r.text();if(text.length<10000||text.trimStart().startsWith('<'))throw new Error('Unexpected download content');data=text;break;}catch(e){failures.push(`${new URL(url).hostname}: ${e.message}`);}}
      if(!data)throw new Error(`Could not download ${name}. Internet access is required for the first setup.\n${failures.join('\n')}`);
    }
    await writeFile(destination+'.tmp',data,'utf8');await rename(destination+'.tmp',destination);
  }
  if(!quiet)console.log('Three.js is installed in vendor/. The game can now run without a CDN.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){installVendor().catch(e=>{console.error(e.message);process.exitCode=1;});}
