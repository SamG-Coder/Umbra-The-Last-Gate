import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {ROOT,installVendor} from './vendor.mjs';
const argv=process.argv.slice(2),value=(flag,fallback)=>{const i=argv.indexOf(flag);return i<0?fallback:argv[i+1];};
const port=Number(value('--port','8000')),host=value('--host','127.0.0.1');
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Choose a valid port between 1 and 65535.');
if(!argv.includes('--no-vendor'))try{await installVendor();}catch(e){console.warn(e.message);console.warn('Serving anyway. The browser will try its CDN fallback.');}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
    const requestPath=decodeURIComponent(new URL(req.url,'http://local').pathname);
    const filename=path.resolve(ROOT,'.'+(requestPath==='/'?'/index.html':requestPath));
    if((filename!==ROOT&&!filename.startsWith(ROOT+path.sep))||requestPath.includes('\0')||requestPath.includes('\\')){res.writeHead(403).end('Forbidden');return;}
    const entry=await stat(filename);if(!entry.isFile())throw new Error('Not a file');
    const body=await readFile(filename);res.writeHead(200,{'Content-Type':MIME[path.extname(filename)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is already in use. Close the previous launcher or use --port 8001.`:e.message);process.exitCode=1;});
server.listen(port,host,()=>{
  const url=`http://${host==='0.0.0.0'?'localhost':host}:${port}`;
  console.log(`\nUMBRA — THE LAST GATE\n${url}\n\nKeep this terminal open while playing. Ctrl+C stops the server.\n`);
  if(argv.includes('--open')){
    const cmd=process.platform==='win32'?['cmd',['/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];
    const child=spawn(cmd[0],cmd[1],{stdio:'ignore'});child.on('error',()=>console.log(`Open ${url} in your browser.`));child.unref();
  }
});
