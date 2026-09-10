/* Local-first native-module boot. There is no build step and no hidden service. */
(async()=>{
  const status=document.getElementById('loading-status'),error=document.getElementById('load-error');
  function fail(message){status.textContent='The gate needs one more thing.';error.hidden=false;error.textContent=message;document.querySelector('.loader-line').style.display='none';}
  if(location.protocol==='file:'){
    fail('Extract the ZIP, then run START-WINDOWS.bat (Windows), ./start.sh, or npm start. Browsers block JavaScript modules when index.html is opened directly from disk. The launcher opens the correct local address.');return;
  }
  const root=new URL('../',document.currentScript?.src||new URL('src/bootstrap.js',location.href));
  let moduleURL=new URL('vendor/three.module.js',root).href;
  try{
    const [local,core]=await Promise.all([fetch(moduleURL,{method:'HEAD',cache:'no-cache'}),fetch(new URL('vendor/three.core.js',root),{method:'HEAD',cache:'no-cache'})]);
    if(!local.ok||!core.ok){
      status.textContent='Loading the Three.js engine (internet required on first launch)…';
      const hosts=['https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js','https://unpkg.com/three@0.180.0/build/three.module.js'];
      let found=false;
      for(const url of hosts){try{const response=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(9000)});if(response.ok){moduleURL=url;found=true;break;}}catch{}}
      if(!found)throw new Error('Three.js is not installed locally and the engine CDNs could not be reached. Connect to the internet and run the launcher again, or run npm run vendor. The launcher downloads the pinned engine into vendor/ so subsequent starts can work offline.');
    }
    const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports:{three:moduleURL}});document.head.appendChild(map);
    await import(new URL('src/main.js',root).href);
  }catch(e){console.error(e);fail(e.message||String(e));}
})();
