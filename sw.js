const CACHE_NAME = 'amalan-rc111-offline-v1';

const APP_SHELL = [
  './',
  './index.html',
  './Amalan_RC80.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const OFFLINE_LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async u=>{try{await cache.add(u)}catch(e){}}));
    await Promise.all(OFFLINE_LIBS.map(async u=>{
      try{
        const r=await fetch(u,{mode:'cors',cache:'no-store'});
        if(r && (r.ok || r.type==='opaque')) await cache.put(u,r.clone());
      }catch(e){}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const cached=await caches.match('./index.html');
        if(!navigator.onLine && cached)return cached;
        const r=await fetch(req);
        if(r && r.ok) await (await caches.open(CACHE_NAME)).put('./index.html',r.clone());
        return r;
      }catch(e){
        return (await caches.match(req)) || (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith((async()=>{
      const cached=await caches.match(req);
      if(cached)return cached;
      try{
        const r=await fetch(req);
        if(r && r.ok) await (await caches.open(CACHE_NAME)).put(req,r.clone());
        return r;
      }catch(e){
        return caches.match('./index.html');
      }
    })());
    return;
  }

  if(OFFLINE_LIBS.includes(req.url)){
    event.respondWith((async()=>{
      const cached=await caches.match(req);
      if(cached)return cached;
      try{
        const r=await fetch(req);
        if(r && (r.ok || r.type==='opaque')) await (await caches.open(CACHE_NAME)).put(req,r.clone());
        return r;
      }catch(e){
        return new Response('',{status:503,statusText:'Offline resource unavailable'});
      }
    })());
  }
});
