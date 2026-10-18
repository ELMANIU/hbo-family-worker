// ============================================================
// FÉNIX TV — MULTICHANNEL LINEAR DIRECT WORKER v3.2.0
// FÉNIX TV STUDIO + CANALES FÉNIX (CATEGORÍA AUTOMÁTICA)
// MP4 / MKV / HLS + EPG + NOW/NEXT + COMERCIALES + QUEUE
// Compatible con rutas legacy del reproductor.
// ============================================================

const WORKER_VERSION = "3.2.0-fenix-studio-categoria-automatica";
const DEFAULT_REMOTE_CONFIG_URL =
  "https://raw.githubusercontent.com/ELMANIU/hbo-family-worker/refs/heads/main/channels.json";
const DEFAULT_UPSTREAM_CATALOG_URL =
  "https://raw.githubusercontent.com/ELMANIU/Roku-feed/main/catalog.json";
const FENIX_CATEGORY_KEY = "canales-fenix";
const FENIX_CATEGORY_TITLE = "Canales Fénix";
const CONFIG_TTL_MS = 20_000;
const UPSTREAM_TTL_MS = 30_000;
const TIMELINE_TTL_MS = 20_000;
const SOURCE_CACHE_TTL_SECONDS = 3600;
const GUIDE_PAST_DAYS = 1;
const GUIDE_FUTURE_DAYS = 7;
const MAX_GUIDE_EVENTS = 5000;
const DEFAULT_QUEUE_HORIZON_SECONDS = 172800;
const DEFAULT_CHANNEL_KEY = "hbofamily";

// Respaldo de emergencia: no sustituye el panel FÉNIX TV STUDIO.
// Mantiene FENIX FAMILY con los programas de la versión anterior.
const FALLBACK_CONFIG = {
  schemaVersion: 1,
  configVersion: "2026-10-03.1",
  updatedAt: "2026-10-03T21:12:00Z",
  channels: {
    hbofamily: {
      enabled: true,
      id: "hbo-family-hd",
      name: "HBO FAMILY HD",
      description: "Películas y series familiares en señal lineal 24/7.",
      categoryKey: "peliculas",
      categoryTitle: "Películas",
      specialKey: "hbofamily",
      playerStyle: "hbofamily",
      playerTitleMode: "channelOnly",
      epoch: 1790899200,
      logo: "https://dl.dropbox.com/scl/fi/lc6b4gg1twqumr4vrakqj/file_00000000ea5081f5ae4dbb5801f12815.png?rlkey=m6w76492cyq0z12lx91mgo31b&st=kq7ilsda&dl=0",
      channelBugUrl: "https://dl.dropbox.com/scl/fi/wfvxs2ld2nkrw2p5mvxr4/file_00000000875881f5b8eb4726d70d23c3.png?rlkey=hdpi75re6qn1ehrhq446ps2zr&st=r6ak8axz&dl=0",
      channelBugOpacity: 0.78,
      channelBugScale: 1.55,
      channelBugAnimation: true,
      channelBugAnimationIntervalSeconds: 420,
      videoAspectRatio: "16:9",
      programOverlay: true,
      queueHorizonSeconds: 172800,
      commercial: {
        enabled: true,
        url: "https://pub-31c3df763d1f4f2bbd2602595581aa82.r2.dev/FenixTV_COMERCIAL_REAL_1m30_ROKU_1080p_OPTIMIZADO_TEXTO_CORREGIDO.mp4",
        streamFormat: "mp4",
        durationSeconds: 90,
        intervalSeconds: 900,
        protectStartSeconds: 60,
        protectEndSeconds: 60,
        betweenPrograms: false,
        legacyTsUrl: "https://hugh.cdn.rumble.cloud/video/fwe2/a0/s8/2/Y/B/T/2/YBT2A.aaa.ts"
      },
      programs: [
        {id:"shrek-1",title:"Shrek",description:"Película familiar en español latino.",type:"pelicula",url:"https://hugh.cdn.rumble.cloud/video/fwe2/40/s8/2/e/s/0/2/es02A.aaa.mp4",streamFormat:"mp4",durationSeconds:5466,aspectRatio:"16:9",enabled:true},
        {id:"shrek-2",title:"Shrek 2",description:"Película familiar en español latino.",type:"pelicula",url:"https://hugh.cdn.rumble.cloud/video/fwe2/50/s8/2/q/6/9/2/q692A.aaa.mp4",streamFormat:"mp4",durationSeconds:5558,aspectRatio:"16:9",enabled:true},
        {id:"kung-fu-panda-3",title:"Kung Fu Panda 3",description:"Película familiar de DreamWorks (2016) en español latino.",type:"pelicula",url:"https://hugh.cdn.rumble.cloud/video/fww1/be/s8/2/I/x/q/3/Ixq3A.aaa.mp4",streamFormat:"mp4",durationSeconds:5694,aspectRatio:"16:9",enabled:true},
        {id:"chicas-superpoderosas-s01e01",title:"Las Chicas Superpoderosas — Simono dice... / Un toque femenino",description:"Temporada 1 · Episodio 1 · Español latino",type:"serie",url:"https://hugh.cdn.rumble.cloud/video/fww1/3d/s8/2/G/b/-/2/Gb-2A.aaa.mp4",streamFormat:"mp4",durationSeconds:1364,aspectRatio:"4:3",enabled:true},
        {id:"chicas-superpoderosas-s01e02",title:"Las Chicas Superpoderosas — El insecto que llevamos dentro / Doble personalidad",description:"Temporada 1 · Episodio 2 · Español latino",type:"serie",url:"https://hugh.cdn.rumble.cloud/video/fwe2/e3/s8/2/A/d/-/2/Ad-2A.aaa.mp4",streamFormat:"mp4",durationSeconds:1364,aspectRatio:"4:3",enabled:true},
        {id:"chicas-superpoderosas-s01e03",title:"Las Chicas Superpoderosas — El pulpo del mal / Problemas",description:"Temporada 1 · Episodio 3 · Español latino",type:"serie",url:"https://hugh.cdn.rumble.cloud/video/fww1/88/s8/2/0/f/-/2/0f-2A.aaa.mp4",streamFormat:"mp4",durationSeconds:1355,aspectRatio:"4:3",enabled:true},
        {id:"tom-y-jerry-la-pelicula",title:"Tom y Jerry: La película",description:"Película familiar en español latino.",type:"pelicula",url:"https://hugh.cdn.rumble.cloud/video/fwe2/f7/s8/2/I/x/-/2/Ix-2A.aaa.mp4",streamFormat:"mp4",durationSeconds:6065,aspectRatio:"16:9",enabled:true},
        {id:"los-croods",title:"Los Croods",description:"Película familiar en español latino.",type:"pelicula",url:"https://hugh.cdn.rumble.cloud/video/fwe2/25/s8/2/I/s/p/3/Isp3A.aaa.mkv",streamFormat:"mkv",durationSeconds:5917,aspectRatio:"16:9",enabled:true}
      ]
    }
  }
};

let configCache = null, configCacheAt = 0, configPromise = null;
let upstreamCache = null, upstreamCacheAt = 0, upstreamPromise = null;
const timelineCache = new Map();

// ----------------------------- UTILIDADES -----------------------------
function errorText(e) { return e instanceof Error ? e.message : String(e); }
function normalizePath(p) { return p === "/" ? "/" : p.replace(/\/+$/, "") || "/"; }
function numberValue(v, fallback=0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function boolValue(v, fallback=false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    if (["true","1","yes","si","sí"].includes(v.trim().toLowerCase())) return true;
    if (["false","0","no"].includes(v.trim().toLowerCase())) return false;
  }
  return fallback;
}
function stringValue(v, fallback="") { if (v == null) return fallback; return String(v).trim() || fallback; }
function slug(v) { return stringValue(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function iso(s) { return new Date(s * 1000).toISOString(); }
function inferFormat(url) {
  const s=stringValue(url).toLowerCase().split("?")[0];
  return s.endsWith(".mkv") ? "mkv" : s.endsWith(".m3u8") ? "hls" : "mp4";
}
function publicBaseUrl(request, env) {
  try { const u = new URL(String(env.PUBLIC_BASE_URL || "")); if (u.protocol === "https:") return u.origin; } catch {}
  return new URL(request.url).origin;
}
function commonHeaders() {
  return {"access-control-allow-origin":"*", "access-control-allow-methods":"GET, HEAD, OPTIONS",
    "access-control-allow-headers":"*", "x-content-type-options":"nosniff"};
}
function responseJSON(value, status=200, headOnly=false) {
  return new Response(headOnly ? null : JSON.stringify(value, null, 2), {
    status, headers:{...commonHeaders(),"content-type":"application/json; charset=utf-8",
      "cache-control":"no-store, no-cache, must-revalidate, max-age=0"}
  });
}
function responseText(value, status=200, headOnly=false, contentType="text/plain; charset=utf-8") {
  return new Response(headOnly ? null : value, {status,
    headers:{...commonHeaders(), "content-type":contentType, "cache-control":"no-store, no-cache, must-revalidate, max-age=0"}});
}
function deepClone(x) { return JSON.parse(JSON.stringify(x)); }
async function shortHash(txt) {
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(txt));
  return Array.from(new Uint8Array(digest)).slice(0,10).map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function fetchJsonText(url, agent, cacheSeconds=0, extraHeaders={}) {
  const options={headers:{Accept:"application/json, text/plain, */*", "Cache-Control":"no-cache, no-store, max-age=0", Pragma:"no-cache", "User-Agent":agent, ...extraHeaders}};
  if(cacheSeconds>0) options.cf={cacheTtl:cacheSeconds,cacheEverything:true};
  const r=await fetch(url,options);
  if(!r.ok) throw new Error("HTTP " + r.status + " cargando " + url);
  const text=await r.text();
  return {parsed:JSON.parse(text), text, finalUrl:r.url||url};
}

// ----------------------------- CONFIGURACIÓN -----------------------------
function rawChannels(raw) {
  if(!raw || typeof raw!=="object") return [];
  if(Array.isArray(raw.channels)) return raw.channels.map((ch,i)=>[ch.key||ch.slug||"channel-"+i,ch]);
  return raw.channels && typeof raw.channels==="object" ? Object.entries(raw.channels) : [];
}
function normalizeProgram(raw,index) {
  if(!raw || typeof raw!=="object" || !boolValue(raw.enabled,true)) return null;
  const url=stringValue(raw.url||raw.Url||raw.Stream||raw.streamUrl);
  if(!url) return null;
  const title=stringValue(raw.title||raw.Title||raw.name||raw.nombre,"Programa "+(index+1));
  const streamFormat=stringValue(raw.streamFormat||raw.format,inferFormat(url)).toLowerCase();
  if(!["mp4","mkv","hls"].includes(streamFormat)) throw new Error("Formato no soportado en "+title+": "+streamFormat);
  return {id:stringValue(raw.id,slug(title)||"program-"+index),title,
    description:stringValue(raw.description||raw.Description||raw.descripcion,title),
    type:stringValue(raw.type||raw.tipo,"pelicula"),url,streamFormat,
    durationSeconds:numberValue(raw.durationSeconds||raw.Duration||raw.duration,0),
    aspectRatio:stringValue(raw.aspectRatio,"16:9")};
}
function normalizeChannel(hint, raw) {
  if(!raw || typeof raw!=="object" || !boolValue(raw.enabled,true)) return null;
  const key=slug(raw.key||raw.slug||raw.specialKey||hint);
  if(!key) throw new Error("Canal sin clave válida");
  const name=stringValue(raw.name||raw.Title||raw.title||raw.nombre,key);
  const schedule=raw.schedule && typeof raw.schedule==="object" ? raw.schedule : {};
  const programSource=raw.programs||schedule.programs||schedule.movies||schedule.items||[];
  const programs=Array.isArray(programSource) ? programSource.map(normalizeProgram).filter(Boolean) : [];
  const ads=raw.commercial && typeof raw.commercial==="object" ? raw.commercial : (schedule.commercial||{});
  const adUrl=stringValue(ads.url||schedule.commercialUrl||raw.commercialUrl);
  const adDuration=numberValue(ads.durationSeconds||schedule.adDuration||schedule.commercialDuration||raw.commercialDuration,0);
  const adInterval=numberValue(ads.intervalSeconds||schedule.adInterval||schedule.adIntervalSeconds||raw.adInterval,0);
  return {
    key,id:stringValue(raw.id||raw.contentId,key),name,
    description:stringValue(raw.description||raw.Description||raw.descripcion,"Canal lineal 24/7."),
    categoryKey:stringValue(raw.categoryKey||raw.CategoryKey,"24_7"),
    categoryTitle:stringValue(raw.categoryTitle||raw.CategoryTitle,"24/7"),
    specialKey:stringValue(raw.specialKey,key),playerStyle:stringValue(raw.playerStyle,"generic247"),
    playerTitleMode:stringValue(raw.playerTitleMode,"channelOnly"),
    epoch:numberValue(raw.epoch||raw.linearAnchor||schedule.epoch||schedule.linearAnchor,0),
    logo:stringValue(raw.logo||raw.Logo),
    channelBugUrl:stringValue(raw.channelBugUrl||raw.bugUrl||raw.logoBug),
    channelBugOpacity:numberValue(raw.channelBugOpacity||raw.bugOpacity,0.78),
    channelBugScale:numberValue(raw.channelBugScale||raw.bugScale,1.3),
    channelBugWidth:numberValue(raw.channelBugWidth||raw.bugWidth,0),
    channelBugHeight:numberValue(raw.channelBugHeight||raw.bugHeight,0),
    channelBugAnimation:boolValue(raw.channelBugAnimation,false),
    channelBugAnimationIntervalSeconds:Math.max(1,numberValue(raw.channelBugAnimationIntervalSeconds,420)),
    videoAspectRatio:stringValue(raw.videoAspectRatio||raw.aspectRatio,"16:9"),
    programOverlay:boolValue(raw.programOverlay,true),
    queueHorizonSeconds:Math.max(21600,Math.min(259200,numberValue(raw.queueHorizonSeconds||schedule.queueHorizonSeconds,DEFAULT_QUEUE_HORIZON_SECONDS))),
    commercial:{enabled:boolValue(ads.enabled,!!adUrl&&adDuration>0),url:adUrl,
      streamFormat:stringValue(ads.streamFormat,inferFormat(adUrl||".mp4")).toLowerCase(),
      durationSeconds:adDuration,intervalSeconds:adInterval,
      protectStartSeconds:numberValue(ads.protectStartSeconds,60),
      protectEndSeconds:numberValue(ads.protectEndSeconds,60),
      betweenPrograms:boolValue(ads.betweenPrograms,false), legacyTsUrl:stringValue(ads.legacyTsUrl)},
    programs
  };
}
function normalizeConfig(raw) {
  const channels=rawChannels(raw).map(([k,c])=>normalizeChannel(k,c)).filter(Boolean);
  if(!channels.length) throw new Error("channels.json no contiene canales habilitados");
  const identities=new Set();
  for(const c of channels) {
    if(!(c.epoch>0)) throw new Error("Falta epoch en "+c.name);
    if(!c.programs.length) throw new Error("No hay programas en "+c.name);
    if(identities.has(c.key)) throw new Error("Clave de canal duplicada: "+c.key);
    identities.add(c.key);
  }
  return {schemaVersion:numberValue(raw.schemaVersion,1),
    configVersion:stringValue(raw.configVersion||raw.version,"1"),
    updatedAt:stringValue(raw.updatedAt),channels};
}
async function loadConfig(env) {
  const now=Date.now();
  if(configCache && now-configCacheAt<CONFIG_TTL_MS) return configCache;
  if(configPromise) return configPromise;
  configPromise=(async()=>{
    const disabled=String(env.DISABLE_REMOTE_CONFIG||"")==="1";
    const url=stringValue(env.CHANNELS_CONFIG_URL,DEFAULT_REMOTE_CONFIG_URL);
    if(!disabled && url) {
      try {
        const headers={};
        if(env.CONFIG_BEARER_TOKEN) headers.Authorization="Bearer "+String(env.CONFIG_BEARER_TOKEN);
        const loaded=await fetchJsonText(url,"FenixTV-Multichannel/"+WORKER_VERSION,0,headers);
        const normalized=normalizeConfig(loaded.parsed);
        return {...normalized,revision:normalized.configVersion+"-"+await shortHash(loaded.text),
          source:loaded.finalUrl,remote:true,warning:""};
      } catch(e) {
        console.warn("Remote channels.json unavailable; using fallback",errorText(e));
        if(String(env.REQUIRE_REMOTE_CONFIG||"")==="1") throw e;
        const fallback=normalizeConfig(FALLBACK_CONFIG);
        return {...fallback,revision:"fallback-"+fallback.configVersion,source:"embedded-fallback",remote:false,warning:errorText(e)};
      }
    }
    const fallback=normalizeConfig(FALLBACK_CONFIG);
    return {...fallback,revision:"fallback-"+fallback.configVersion,source:"embedded-fallback",remote:false,
      warning:disabled?"remote config disabled":""};
  })().then(result=>{
    if(!configCache || configCache.revision!==result.revision) timelineCache.clear();
    configCache=result;configCacheAt=Date.now();return result;
  }).finally(()=>{configPromise=null;});
  return configPromise;
}
function findChannel(config,key) {
  const id=slug(key);
  return config.channels.find(c=>c.key===id||slug(c.id)===id||slug(c.specialKey)===id)||null;
}

// ----------------------------- HLS Y DURACIÓN -----------------------------
function resolveUri(uri,baseUrl) {
  const u=new URL(String(uri).trim(),baseUrl);
  if(!["http:","https:"].includes(u.protocol)) throw new Error("Protocolo no permitido: "+u.protocol);
  return u.href;
}
function parseBandwidth(tag) { const m=tag.match(/\bBANDWIDTH\s*=\s*(\d+)/i);return m?Number(m[1]):0; }
function bestVariant(text,base) {
  const lines=text.split(/\r?\n/),choices=[];
  for(let i=0;i<lines.length;i++) {
    const tag=lines[i].trim();
    if(!tag.toUpperCase().startsWith("#EXT-X-STREAM-INF:")) continue;
    for(let j=i+1;j<lines.length;j++) {
      const next=lines[j].trim();if(!next) continue;
      if(!next.startsWith("#")) choices.push({url:resolveUri(next,base),bandwidth:parseBandwidth(tag)});
      break;
    }
  }
  if(!choices.length) throw new Error("Playlist maestra sin variantes");
  choices.sort((a,b)=>a.bandwidth-b.bandwidth);
  return choices[choices.length-1].url;
}
async function fetchM3u8(url) {
  const r=await fetch(url,{headers:{Accept:"application/vnd.apple.mpegurl, application/x-mpegURL, text/plain, */*",
    "User-Agent":"FenixTV-Multichannel/"+WORKER_VERSION},
    cf:{cacheTtl:SOURCE_CACHE_TTL_SECONDS,cacheEverything:true}});
  if(!r.ok) throw new Error("HTTP "+r.status+" cargando "+url);
  const text=await r.text();if(!text.includes("#EXTM3U")) throw new Error("La fuente no devolvió M3U8");
  return {text,finalUrl:r.url||url};
}
async function hlsDurationSeconds(url,depth=0) {
  if(depth>3) throw new Error("Demasiadas playlists maestras encadenadas");
  const loaded=await fetchM3u8(url);
  if(/#EXT-X-STREAM-INF:/i.test(loaded.text)) return hlsDurationSeconds(bestVariant(loaded.text,loaded.finalUrl),depth+1);
  let sum=0,m;const re=/#EXTINF:\s*([0-9]+(?:\.[0-9]+)?)/gi;
  while((m=re.exec(loaded.text))) {const n=Number(m[1]);if(Number.isFinite(n)&&n>0)sum+=n;}
  if(!(sum>0)) throw new Error("No se pudo calcular la duración HLS");
  return Number(sum.toFixed(3));
}
async function resolvedPrograms(channel) {
  const out=[];
  for(const p of channel.programs) {
    let duration=numberValue(p.durationSeconds,0);
    if(!duration && p.streamFormat==="hls") duration=await hlsDurationSeconds(p.url);
    if(!(duration>0)) throw new Error("Falta durationSeconds válido para "+p.title+" en "+channel.name);
    out.push({...p,durationSeconds:duration});
  }
  return out;
}

// ----------------------------- MOTOR LINEAL -----------------------------
function appendProgramBlock(timeline,program,programIndex,sourceStart,sourceEnd) {
  if(sourceEnd<=sourceStart) return;
  const duration=sourceEnd-sourceStart;
  timeline.blocks.push({id:`program-${programIndex}-${sourceStart.toFixed(3)}`,kind:"program",isCommercial:false,
    programIndex,title:program.title,description:program.description,type:program.type,url:program.url,
    streamFormat:program.streamFormat,aspectRatio:program.aspectRatio||"16:9",sourceStart,sourceEnd,
    start:timeline.total,end:timeline.total+duration,duration});
  timeline.total+=duration;
}
function appendCommercialBlock(timeline,channel,programIndex,commercialNumber) {
  const c=channel.commercial;
  if(!c.enabled||!c.url||!(c.durationSeconds>0)) return;
  timeline.blocks.push({id:`commercial-${programIndex}-${commercialNumber}`,kind:"commercial",isCommercial:true,
    programIndex,title:"Corte comercial",description:"Corte comercial Fénix TV.",type:"comercial",url:c.url,
    streamFormat:c.streamFormat||inferFormat(c.url),aspectRatio:"16:9",sourceStart:0,sourceEnd:c.durationSeconds,
    start:timeline.total,end:timeline.total+c.durationSeconds,duration:c.durationSeconds});
  timeline.total+=c.durationSeconds;
}
async function buildTimeline(channel) {
  const programs=await resolvedPrograms(channel);
  const timeline={channelKey:channel.key,programs,blocks:[],programWindows:[],total:0};
  const ad=channel.commercial;
  const intervalEnabled=ad.enabled&&!!ad.url&&ad.durationSeconds>0&&ad.intervalSeconds>0;
  for(let i=0;i<programs.length;i++) {
    const p=programs[i],start=timeline.total;
    let cursor=0,adCount=0;
    if(intervalEnabled) {
      for(let cut=ad.intervalSeconds;cut<p.durationSeconds;cut+=ad.intervalSeconds) {
        if(cut<ad.protectStartSeconds || p.durationSeconds-cut<ad.protectEndSeconds) continue;
        appendProgramBlock(timeline,p,i,cursor,cut);
        appendCommercialBlock(timeline,channel,i,++adCount);
        cursor=cut;
      }
    }
    appendProgramBlock(timeline,p,i,cursor,p.durationSeconds);
    if(ad.enabled&&ad.betweenPrograms&&ad.url&&ad.durationSeconds>0) appendCommercialBlock(timeline,channel,i,++adCount);
    timeline.programWindows.push({programIndex:i,start,end:timeline.total,wallDuration:timeline.total-start,
      contentDuration:p.durationSeconds,commercialCount:adCount});
  }
  if(!(timeline.total>0)||!timeline.blocks.length) throw new Error("La línea de tiempo quedó vacía para "+channel.name);
  return timeline;
}
async function getTimeline(config,channel) {
  const key=config.revision+":"+channel.key,cached=timelineCache.get(key);
  if(cached&&Date.now()-cached.at<TIMELINE_TTL_MS) return cached.timeline;
  const timeline=await buildTimeline(channel);
  timelineCache.set(key,{at:Date.now(),timeline});
  if(timelineCache.size>Math.max(8,config.channels.length*3)) {
    for(const k of timelineCache.keys()) if(!k.startsWith(config.revision+":")) timelineCache.delete(k);
  }
  return timeline;
}
function livePosition(channel,timeline,nowSeconds) {
  const elapsed=Math.max(0,nowSeconds-channel.epoch);
  let cycle=Math.floor(elapsed/timeline.total);
  let position=elapsed-cycle*timeline.total;
  if(position>=timeline.total-0.001) {cycle++;position=0;}
  let blockIndex=timeline.blocks.length-1;
  for(let i=0;i<timeline.blocks.length;i++) {
    const b=timeline.blocks[i];if(position>=b.start&&position<b.end){blockIndex=i;break;}
  }
  return {cycle,position,blockIndex,block:timeline.blocks[blockIndex]};
}
function nextProgramIndex(timeline,index) {return (index+1)%timeline.programs.length;}
function programOccurrence(channel,timeline,cycle,programIndex) {
  const p=timeline.programs[programIndex],w=timeline.programWindows[programIndex];
  const cycleStart=channel.epoch+cycle*timeline.total;
  return {id:p.id,title:p.title,description:p.description,type:p.type,isCommercial:false,
    start:iso(cycleStart+w.start),end:iso(cycleStart+w.end),startSeconds:cycleStart+w.start,
    endSeconds:cycleStart+w.end,durationSeconds:Number(w.wallDuration.toFixed(3)),
    contentDurationSeconds:Number(p.durationSeconds.toFixed(3)),commercialCount:w.commercialCount};
}
function buildStatus(config,channel,timeline,state,nowSeconds,baseUrl) {
  const block=state.block,p=timeline.programs[block.programIndex],nextIndex=nextProgramIndex(timeline,block.programIndex);
  const nextCycle=state.cycle+(nextIndex===0?1:0);
  const nowContent=programOccurrence(channel,timeline,state.cycle,block.programIndex);
  const nextContent=programOccurrence(channel,timeline,nextCycle,nextIndex);
  const positionInBlock=Math.max(0,Math.min(block.duration,state.position-block.start));
  const sourcePosition=block.isCommercial?block.sourceStart:block.sourceStart+positionInBlock;
  const progress=Math.max(0,Math.min(1,sourcePosition/Math.max(.001,p.durationSeconds)));
  const showNow=!block.isCommercial&&sourcePosition<60;
  const showNext=!block.isCommercial&&sourcePosition>=Math.max(0,p.durationSeconds-60);
  const channelPath=baseUrl+"/channel/"+channel.key;
  return {
    version:WORKER_VERSION,configRevision:config.revision,id:channel.id,key:channel.key,channel:channel.name,
    channelTitle:channel.name,playerTitle:channel.name,playerTitleMode:channel.playerTitleMode||"channelOnly",
    playbackMode:"linearDirect",generatedAt:new Date().toISOString(),cycle:state.cycle,
    positionInCycleSeconds:Number(state.position.toFixed(3)),cycleDurationSeconds:Number(timeline.total.toFixed(3)),
    progressPercent:Number((progress*100).toFixed(2)),
    media:{blockId:state.cycle+":"+block.id,kind:block.kind,isCommercial:block.isCommercial,url:block.url,
      streamFormat:block.streamFormat,aspectRatio:block.aspectRatio||"16:9",
      seekSeconds:Number((block.isCommercial?positionInBlock:block.sourceStart+positionInBlock).toFixed(3)),
      blockPositionSeconds:Number(positionInBlock.toFixed(3)),blockDurationSeconds:Number(block.duration.toFixed(3)),
      blockRemainingSeconds:Number(Math.max(0,block.duration-positionInBlock).toFixed(3)),
      sourceStartSeconds:Number(block.sourceStart.toFixed(3)),sourceEndSeconds:Number(block.sourceEnd.toFixed(3)),
      contentId:p.id,contentTitle:p.title,contentDurationSeconds:Number(p.durationSeconds.toFixed(3)),
      channelTitle:channel.name,playerTitle:channel.name,playerTitleMode:channel.playerTitleMode||"channelOnly"},
    nowContent,nextContent,now:nowContent,next:nextContent,
    overlay:{showNow,showNext,nowLabel:"ESTÁS VIENDO",nextLabel:"A CONTINUACIÓN",nowTitle:p.title,
      nextTitle:timeline.programs[nextIndex].title,displaySeconds:60,isCommercial:block.isCommercial},
    urls:{status:channelPath+"/status",queue:channelPath+"/status?queue=1",guide:channelPath+"/guide.json"}
  };
}
function buildPlaybackQueue(channel,timeline,state) {
  const queue=[];if(!timeline.blocks.length) return queue;
  let blockIndex=state.blockIndex,cycle=state.cycle,seconds=0,first=true;
  while(seconds<channel.queueHorizonSeconds && queue.length<900) {
    const block=timeline.blocks[blockIndex],p=timeline.programs[block.programIndex];
    const position=first?Math.max(0,Math.min(block.duration,state.position-block.start)):0;
    const playStart=block.isCommercial?position:block.sourceStart+position;
    const remaining=Math.max(.001,block.duration-position);
    const next=timeline.programs[nextProgramIndex(timeline,block.programIndex)];
    queue.push({blockId:cycle+":"+block.id,role:block.isCommercial?"ad":"movie",
      channelRole:block.isCommercial?"ad":"content",kind:block.kind,isCommercial:block.isCommercial,
      title:block.isCommercial?"Corte comercial":p.title,
      description:block.isCommercial?"Corte comercial Fénix TV.":p.description,
      contentTitle:p.title,nextTitle:next?.title||"",channelTitle:channel.name,playerTitle:channel.name,
      playerTitleMode:channel.playerTitleMode||"channelOnly",url:block.url,streamFormat:block.streamFormat,
      aspectRatio:block.aspectRatio||p.aspectRatio||"16:9",clipStartSeconds:Number(block.sourceStart.toFixed(3)),
      clipEndSeconds:Number(block.sourceEnd.toFixed(3)),playStartSeconds:Number(playStart.toFixed(3)),
      durationSeconds:Number(remaining.toFixed(3)),blockDurationSeconds:Number(block.duration.toFixed(3)),
      contentDurationSeconds:Number(p.durationSeconds.toFixed(3)),cycle});
    seconds+=remaining;first=false;blockIndex++;
    if(blockIndex>=timeline.blocks.length){blockIndex=0;cycle++;}
  }
  return queue;
}
function guideEvents(channel,timeline,fromSeconds,untilSeconds) {
  const events=[];
  const first=Math.max(0,Math.floor((fromSeconds-channel.epoch)/timeline.total)-1);
  const last=Math.max(first,Math.floor((untilSeconds-channel.epoch)/timeline.total)+1);
  for(let cycle=first;cycle<=last;cycle++) {
    for(let i=0;i<timeline.programs.length;i++) {
      const e=programOccurrence(channel,timeline,cycle,i);
      if(e.endSeconds<=fromSeconds||e.startSeconds>=untilSeconds) continue;
      events.push({start:e.start,end:e.end,title:e.title,description:e.description,type:e.type,isCommercial:false});
      if(events.length>=MAX_GUIDE_EVENTS) return events;
    }
  }
  return events;
}

// ----------------------------- JSON DE CANAL Y CATÁLOGO -----------------------------
function buildChannelJson(channel,baseUrl,status=null) {
  const root=baseUrl+"/channel/"+channel.key;
  // Los canales administrados siempre pertenecen a «Canales Fénix».
  // La clasificación particular del panel se conserva en subCategoryKey/Title.
  const item={id:channel.id,contentId:channel.id,enabled:true,
    Title:channel.name,title:channel.name,name:channel.name,Description:channel.description,
    CategoryKey:FENIX_CATEGORY_KEY,CategoryTitle:FENIX_CATEGORY_TITLE,
    subCategoryKey:channel.categoryKey,subCategoryTitle:channel.categoryTitle,
    specialKey:channel.specialKey,channelMode:"linearDirect",playerStyle:channel.playerStyle,
    playerTitleMode:channel.playerTitleMode||"channelOnly",channelTitle:channel.name,playerTitle:channel.name,
    linearAnchor:channel.epoch,Logo:channel.logo,channelBugUrl:channel.channelBugUrl,
    channelBugOpacity:channel.channelBugOpacity,channelBugScale:channel.channelBugScale,
    channelBugAnimation:channel.channelBugAnimation,
    channelBugAnimationIntervalSeconds:channel.channelBugAnimationIntervalSeconds,
    videoAspectRatio:channel.videoAspectRatio,programOverlay:channel.programOverlay,
    Url:"",streamFormat:"",statusUrl:root+"/status",queueStatusUrl:root+"/status?queue=1",
    guideUrl:root+"/guide.json",epgUrl:root+"/epg.json",channelJsonUrl:root+"/channel.json",
    healthUrl:root+"/health"};
  if(channel.channelBugWidth>0) item.channelBugWidth=channel.channelBugWidth;
  if(channel.channelBugHeight>0) item.channelBugHeight=channel.channelBugHeight;
  if(status) {
    item.nowContent=status.nowContent;item.nextContent=status.nextContent;
    item.progressPercent=status.progressPercent;item.overlay=status.overlay;
    item.tagline="AHORA: "+status.nowContent.title+" · DESPUÉS: "+status.nextContent.title;
  } else item.tagline=channel.name;
  return item;
}
function commercialPlaylist(channel) {
  const ad=channel.commercial;
  if(!ad.legacyTsUrl||!(ad.durationSeconds>0)) return null;
  return ["#EXTM3U","#EXT-X-VERSION:3","#EXT-X-PLAYLIST-TYPE:VOD",
    "#EXT-X-TARGETDURATION:"+Math.ceil(ad.durationSeconds),"#EXT-X-MEDIA-SEQUENCE:0",
    "#EXTINF:"+ad.durationSeconds.toFixed(3)+",",ad.legacyTsUrl,"#EXT-X-ENDLIST",""].join("\n");
}
async function loadUpstreamCatalog(env) {
  if(upstreamCache && Date.now()-upstreamCacheAt<UPSTREAM_TTL_MS) return upstreamCache;
  if(upstreamPromise) return upstreamPromise;
  upstreamPromise=(async()=>{
    if(String(env.DISABLE_UPSTREAM_CATALOG||"")==="1")
      return {schemaVersion:1,movies:[],series:[],tvCategories:[],linearChannels:[]};
    try {
      const loaded=await fetchJsonText(stringValue(env.UPSTREAM_CATALOG_URL,DEFAULT_UPSTREAM_CATALOG_URL),
        "FenixTV-CatalogMerge/"+WORKER_VERSION);
      return loaded.parsed;
    } catch(e) {
      console.warn("Upstream catalog unavailable",errorText(e));
      return {schemaVersion:1,replaceLocalMovies:false,replaceLocalSeries:false,replaceLocalTv:false,
        movies:[],series:[],tvCategories:[],linearChannels:[],upstreamWarning:errorText(e)};
    }
  })().then(value=>{upstreamCache=value;upstreamCacheAt=Date.now();return value;})
    .finally(()=>{upstreamPromise=null;});
  return upstreamPromise;
}
function channelIdentity(item) {
  if(!item||typeof item!=="object") return [];
  return [slug(item.id),slug(item.contentId),slug(item.specialKey),
    slug(item.Title||item.title||item.name)].filter(Boolean);
}
function isManagedChannel(item,managed) {
  const ids=new Set(channelIdentity(item));
  return managed.some(ch=>[ch.id,ch.key,ch.specialKey,ch.name].some(value=>ids.has(slug(value))));
}
function isFenixCategory(category) {
  return slug(category?.Key||category?.key)===FENIX_CATEGORY_KEY ||
    slug(category?.Title||category?.title)===FENIX_CATEGORY_KEY;
}
async function buildMergedCatalog(request,env,config) {
  const baseUrl=publicBaseUrl(request,env);
  const upstream=deepClone(await loadUpstreamCatalog(env));
  const managed=config.channels;
  delete upstream.catalogUrl;
  if(!Array.isArray(upstream.linearChannels)) upstream.linearChannels=[];
  if(!Array.isArray(upstream.tvCategories)) upstream.tvCategories=[];

  // Evita versiones antiguas de los canales en dos secciones distintas.
  upstream.linearChannels=upstream.linearChannels.filter(item=>!isManagedChannel(item,managed));
  upstream.tvCategories=upstream.tvCategories
    .filter(category=>category && !isFenixCategory(category))
    .map(category=>{
      if(Array.isArray(category.Channels))
        category.Channels=category.Channels.filter(item=>!isManagedChannel(item,managed));
      return category;
    });

  const nowSeconds=Date.now()/1000;
  const fenixChannels=[];
  for(const channel of managed) {
    const timeline=await getTimeline(config,channel);
    const state=livePosition(channel,timeline,nowSeconds);
    const status=buildStatus(config,channel,timeline,state,nowSeconds,baseUrl);
    const item=buildChannelJson(channel,baseUrl,status);
    fenixChannels.push(item);
    upstream.linearChannels.push(item); // No romper builds antiguos de la aplicación.
  }

  // Categoría fija: se actualiza sola al agregar, editar o quitar canales en el panel.
  upstream.tvCategories.unshift({
    Title:FENIX_CATEGORY_TITLE,Key:FENIX_CATEGORY_KEY,
    Description:"Canales exclusivos de FÉNIX TV con programación 24/7.",
    Channels:fenixChannels
  });

  upstream.schemaVersion=numberValue(upstream.schemaVersion,1);
  upstream.updatedAt=new Date().toISOString();
  upstream.fenixMultichannelWorker={version:WORKER_VERSION,configRevision:config.revision,
    configSource:config.source,channelCount:managed.length,fenixCategoryKey:FENIX_CATEGORY_KEY};
  return upstream;
}

// ----------------------------- RESPUESTAS POR CANAL -----------------------------
function parseChannelRoute(path) {
  const match=path.match(/^\/channel\/([^/]+)(\/.*)?$/i);
  if(!match) return null;
  return {key:decodeURIComponent(match[1]),subpath:normalizePath(match[2]||"/")};
}
async function channelResponse(request,env,config,channel,subpath,headOnly) {
  const baseUrl=publicBaseUrl(request,env);
  const timeline=await getTimeline(config,channel);
  const now=Date.now()/1000;
  const state=livePosition(channel,timeline,now);
  const status=buildStatus(config,channel,timeline,state,now,baseUrl);
  const url=new URL(request.url);

  if(["/","/status","/play-state.json"].includes(subpath)) {
    if(url.searchParams.get("queue")==="1") {
      status.queue=buildPlaybackQueue(channel,timeline,state);
      status.queueHorizonSeconds=channel.queueHorizonSeconds;
      status.queueItemCount=status.queue.length;
    }
    return responseJSON(status,200,headOnly);
  }
  if(subpath==="/channel.json") return responseJSON(buildChannelJson(channel,baseUrl,status),200,headOnly);
  if(subpath==="/guide.json"||subpath==="/epg.json") return responseJSON({
    id:channel.id,key:channel.key,channel:channel.name,channelTitle:channel.name,playerTitle:channel.name,
    playerTitleMode:channel.playerTitleMode||"channelOnly",playbackMode:"linearDirect",
    generatedAt:new Date().toISOString(),now:status.nowContent,next:status.nextContent,
    progressPercent:status.progressPercent,
    epg:guideEvents(channel,timeline,now-GUIDE_PAST_DAYS*86400,now+GUIDE_FUTURE_DAYS*86400)
  },200,headOnly);
  if(subpath==="/health") return responseJSON({
    success:true,version:WORKER_VERSION,configRevision:config.revision,key:channel.key,id:channel.id,
    channel:channel.name,playerTitleMode:channel.playerTitleMode||"channelOnly",playbackMode:"linearDirect",
    programCount:timeline.programs.length,blockCount:timeline.blocks.length,
    cycleDurationSeconds:Number(timeline.total.toFixed(3)),
    commercialEveryMinutes:channel.commercial.intervalSeconds>0?channel.commercial.intervalSeconds/60:0,
    commercialDurationSeconds:channel.commercial.durationSeconds,
    commercialPlaybackFormat:channel.commercial.streamFormat,
    playbackQueueHorizonHours:channel.queueHorizonSeconds/3600,
    channelBugAnimation:channel.channelBugAnimation,
    channelBugAnimationIntervalSeconds:channel.channelBugAnimationIntervalSeconds,
    programs:timeline.programs.map((p,i)=>({id:p.id,title:p.title,streamFormat:p.streamFormat,
      durationSeconds:Number(p.durationSeconds.toFixed(3)),
      commercialCount:timeline.programWindows[i].commercialCount}))
  },200,headOnly);
  if(subpath==="/commercial.m3u8") {
    const m3u8=commercialPlaylist(channel);
    if(!m3u8) return responseJSON({success:false,error:"Este canal no tiene commercial.m3u8 legacy."},404,headOnly);
    return responseText(m3u8,200,headOnly,"application/vnd.apple.mpegurl; charset=utf-8");
  }
  if(subpath==="/live.m3u8") return responseJSON({
    success:false,migrated:true,playbackMode:"linearDirect",
    message:"Este canal se resuelve mediante status/queue, no como HLS lineal.",
    statusUrl:baseUrl+"/channel/"+channel.key+"/status",
    queueStatusUrl:baseUrl+"/channel/"+channel.key+"/status?queue=1"
  },410,headOnly);
  return responseJSON({success:false,error:"Ruta de canal no encontrada."},404,headOnly);
}

// ----------------------------- WORKER -----------------------------
export default {
  async fetch(request,env) {
    const url=new URL(request.url),path=normalizePath(url.pathname),headOnly=request.method==="HEAD";
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:commonHeaders()});
    if(!["GET","HEAD"].includes(request.method)) return responseText("Método no permitido",405,headOnly);
    try {
      const config=await loadConfig(env),baseUrl=publicBaseUrl(request,env);
      if(path==="/") return responseJSON({
        service:"fenix-tv-multichannel-linear-direct",version:WORKER_VERSION,configRevision:config.revision,
        configSource:config.source,remoteConfigActive:config.remote,configWarning:config.warning,
        channels:config.channels.map(ch=>({key:ch.key,id:ch.id,name:ch.name,
          playerTitleMode:ch.playerTitleMode||"channelOnly",status:baseUrl+"/channel/"+ch.key+"/status",
          guide:baseUrl+"/channel/"+ch.key+"/guide.json"})),
        catalog:baseUrl+"/catalog.json",serviceHealth:baseUrl+"/service-health"
      },200,headOnly);
      if(path==="/catalog.json") return responseJSON(await buildMergedCatalog(request,env,config),200,headOnly);
      if(path==="/managed-channels.json") {
        const now=Date.now()/1000,items=[];
        for(const ch of config.channels) {
          const t=await getTimeline(config,ch),s=livePosition(ch,t,now);
          items.push(buildChannelJson(ch,baseUrl,buildStatus(config,ch,t,s,now,baseUrl)));
        }
        return responseJSON({linearChannels:items},200,headOnly);
      }
      if(path==="/config-status") return responseJSON({
        success:true,version:WORKER_VERSION,configRevision:config.revision,configVersion:config.configVersion,
        configUpdatedAt:config.updatedAt,configSource:config.source,remoteConfigActive:config.remote,
        warning:config.warning,cacheTtlSeconds:CONFIG_TTL_MS/1000,
        channelCount:config.channels.length,channelKeys:config.channels.map(ch=>ch.key),
        fenixCategoryKey:FENIX_CATEGORY_KEY
      },200,headOnly);
      if(path==="/service-health") {
        const results=[];
        for(const ch of config.channels) {
          try {
            const t=await getTimeline(config,ch);
            results.push({key:ch.key,id:ch.id,success:true,playerTitleMode:ch.playerTitleMode||"channelOnly",
              programs:t.programs.length,blocks:t.blocks.length,
              cycleDurationSeconds:Number(t.total.toFixed(3))});
          } catch(e){results.push({key:ch.key,id:ch.id,success:false,error:errorText(e)});}
        }
        return responseJSON({success:results.every(item=>item.success),version:WORKER_VERSION,
          configRevision:config.revision,configSource:config.source,channels:results},200,headOnly);
      }
      const route=parseChannelRoute(path);
      if(route) {
        const ch=findChannel(config,route.key);
        if(!ch) return responseJSON({success:false,error:"Canal no encontrado: "+route.key},404,headOnly);
        return channelResponse(request,env,config,ch,route.subpath,headOnly);
      }
      // Rutas legacy para aplicaciones anteriores.
      const legacy=findChannel(config,DEFAULT_CHANNEL_KEY)||config.channels[0];
      if(["/status","/play-state.json","/channel.json","/guide.json","/epg.json",
        "/health","/commercial.m3u8","/live.m3u8"].includes(path))
        return channelResponse(request,env,config,legacy,path,headOnly);
      return responseJSON({success:false,error:"Ruta no encontrada."},404,headOnly);
    } catch(e) {
      console.error("Fénix Multichannel Worker error",e);
      return responseJSON({success:false,error:"Error: "+errorText(e)},502,headOnly);
    }
  }
};

// Funciones exportadas para pruebas locales, sin cambiar el comportamiento del Worker.
export const __test={normalizeConfig,buildTimeline,livePosition,buildStatus,
  buildPlaybackQueue,guideEvents,buildMergedCatalog,isFenixCategory,buildChannelJson};
