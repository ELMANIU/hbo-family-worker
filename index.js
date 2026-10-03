// ============================================================
// HBO FAMILY HD - FENIX TV
// Cloudflare Worker v2.6 - LINEAR DIRECT / MP4 + MKV
//
// En vez de construir una senal HLS completa con cada pelicula,
// el Worker mantiene una linea de tiempo 24/7 y le dice a Roku:
//   - que archivo debe reproducir ahora
//   - en que segundo debe entrar
//   - cuando empieza/termina el bloque actual
//   - que contenido esta al aire y cual sigue
//
// El motor acepta archivos originales MP4 y MKV directamente.
// Para archivos directos debes indicar durationSeconds. No se transcodifica,
// no se remultiplexa y el Worker no toca la calidad del archivo.
// La programacion actual usa archivos MP4 directos. El motor tambien acepta MKV
// si agregas un programa con streamFormat: "mkv" y su durationSeconds exacto.
//
// El comercial TS se expone como /commercial.m3u8 para que Roku lo trate
// como un VOD HLS de 90 s y el Worker conserve la sincronizacion 24/7.
// ============================================================

const WORKER_VERSION = "2.6.0-linear-direct";

const CHANNEL_ID = "hbo-family-hd";
const CHANNEL_KEY = "hbofamily";
const CHANNEL_NAME = "HBO FAMILY HD";
const CHANNEL_DESCRIPTION = "Peliculas y series familiares en señal lineal 24/7.";

const CHANNEL_LOGO =
  "https://dl.dropbox.com/scl/fi/lc6b4gg1twqumr4vrakqj/file_00000000ea5081f5ae4dbb5801f12815.png?rlkey=m6w76492cyq0z12lx91mgo31b&st=kq7ilsda&dl=0";

const CHANNEL_BUG =
  "https://dl.dropbox.com/scl/fi/wfvxs2ld2nkrw2p5mvxr4/file_00000000875881f5b8eb4726d70d23c3.png?rlkey=hdpi75re6qn1ehrhq446ps2zr&st=r6ak8axz&dl=0";

// -------------------- ARCHIVOS DIRECTOS MP4 / MKV --------------------

const SHREK_1_MP4 =
  "https://hugh.cdn.rumble.cloud/video/fwe2/40/s8/2/e/s/0/2/es02A.aaa.mp4";

const SHREK_2_MP4 =
  "https://hugh.cdn.rumble.cloud/video/fwe2/50/s8/2/q/6/9/2/q692A.aaa.mp4";

const CHICAS_SUPERPODEROSAS_S01E01_MP4 =
  "https://hugh.cdn.rumble.cloud/video/fww1/3d/s8/2/G/b/-/2/Gb-2A.aaa.mp4";

const CHICAS_SUPERPODEROSAS_S01E02_MP4 =
  "https://hugh.cdn.rumble.cloud/video/fwe2/e3/s8/2/A/d/-/2/Ad-2A.aaa.mp4";

const CHICAS_SUPERPODEROSAS_S01E03_MP4 =
  "https://hugh.cdn.rumble.cloud/video/fww1/88/s8/2/0/f/-/2/0f-2A.aaa.mp4";

const TOM_Y_JERRY_LA_PELICULA_MP4 =
  "https://hugh.cdn.rumble.cloud/video/fwe2/f7/s8/2/I/x/-/2/Ix-2A.aaa.mp4";

const LOS_CROODS_MP4 =
  "https://hugh.cdn.rumble.cloud/video/fwe2/16/s8/2/O/G/-/2/OG-2A.aaa.mp4";

// Duraciones manuales en segundos.
// IMPORTANTE: la linea de tiempo y el seek dependen de estos valores.
// Si el archivo directo dura distinto, cambia SOLO la constante correspondiente.
const SHREK_1_DURATION_SECONDS = 5400; // 1:30:00 - ajustar al archivo exacto
const SHREK_2_DURATION_SECONDS = 5580; // 1:33:00 - ajustar al archivo exacto
const CHICAS_S01E01_DURATION_SECONDS = 1320; // 22:00 - ajustar al archivo exacto
const CHICAS_S01E02_DURATION_SECONDS = 1320; // 22:00 - ajustar al archivo exacto
const CHICAS_S01E03_DURATION_SECONDS = 1320; // 22:00 - ajustar al archivo exacto
const TOM_Y_JERRY_DURATION_SECONDS = 5040; // 1:24:00 - ajustar al archivo exacto
const LOS_CROODS_DURATION_SECONDS = 5880; // 1:38:00 - ajustar al archivo exacto

const COMMERCIAL_TS =
  "https://hugh.cdn.rumble.cloud/video/fwe2/a0/s8/2/Y/B/T/2/YBT2A.aaa.ts";

const COMMERCIAL_DURATION_SECONDS = 90;
const COMMERCIAL_INTERVAL_SECONDS = 15 * 60;
const PROTECT_START_SECONDS = 60;
const PROTECT_END_SECONDS = 60;

// Todos los dispositivos usan el mismo reloj autoritativo.
const CHANNEL_EPOCH = Date.UTC(2026, 9, 2, 0, 0, 0) / 1000;

const PROGRAMS = [
  {
    id: "shrek-1",
    title: "Shrek",
    description: "Película familiar en español latino.",
    type: "pelicula",
    url: SHREK_1_MP4,
    streamFormat: "mp4",
    durationSeconds: SHREK_1_DURATION_SECONDS,
    aspectRatio: "16:9",
  },
  {
    id: "shrek-2",
    title: "Shrek 2",
    description: "Película familiar en español latino.",
    type: "pelicula",
    url: SHREK_2_MP4,
    streamFormat: "mp4",
    durationSeconds: SHREK_2_DURATION_SECONDS,
    aspectRatio: "16:9",
  },
  {
    id: "chicas-superpoderosas-s01e01",
    title: "Las Chicas Superpoderosas — Simono dice... / Un toque femenino",
    description: "Temporada 1 · Episodio 1 · Español latino",
    type: "serie",
    url: CHICAS_SUPERPODEROSAS_S01E01_MP4,
    streamFormat: "mp4",
    durationSeconds: CHICAS_S01E01_DURATION_SECONDS,
    aspectRatio: "4:3",
  },
  {
    id: "chicas-superpoderosas-s01e02",
    title: "Las Chicas Superpoderosas — El insecto que llevamos dentro / Doble personalidad",
    description: "Temporada 1 · Episodio 2 · Español latino",
    type: "serie",
    url: CHICAS_SUPERPODEROSAS_S01E02_MP4,
    streamFormat: "mp4",
    durationSeconds: CHICAS_S01E02_DURATION_SECONDS,
    aspectRatio: "4:3",
  },
  {
    id: "chicas-superpoderosas-s01e03",
    title: "Las Chicas Superpoderosas — El pulpo del mal / Problemas",
    description: "Temporada 1 · Episodio 3 · Español latino",
    type: "serie",
    url: CHICAS_SUPERPODEROSAS_S01E03_MP4,
    streamFormat: "mp4",
    durationSeconds: CHICAS_S01E03_DURATION_SECONDS,
    aspectRatio: "4:3",
  },
  {
    id: "tom-y-jerry-la-pelicula",
    title: "Tom y Jerry: La película",
    description: "Película familiar en español latino.",
    type: "pelicula",
    url: TOM_Y_JERRY_LA_PELICULA_MP4,
    streamFormat: "mp4",
    durationSeconds: TOM_Y_JERRY_DURATION_SECONDS,
    aspectRatio: "16:9",
  },
  {
    id: "los-croods",
    title: "Los Croods",
    description: "Película familiar en español latino.",
    type: "pelicula",
    url: LOS_CROODS_MP4,
    streamFormat: "mp4",
    durationSeconds: LOS_CROODS_DURATION_SECONDS,
    aspectRatio: "16:9",
  },
];

const SOURCE_CACHE_TTL_SECONDS = 60 * 60;
const SCHEDULE_TTL_MS = 5 * 60 * 1000;
const GUIDE_PAST_DAYS = 1;
const GUIDE_FUTURE_DAYS = 7;
const MAX_GUIDE_EVENTS = 5000;

let timelineCache = null;
let timelineCacheAt = 0;
let timelinePromise = null;

// ============================================================
// UTILIDADES
// ============================================================

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

function normalizePath(pathname) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

function publicBaseUrl(request, env) {
  try {
    const configured = new URL(String(env.PUBLIC_BASE_URL || ""));
    if (configured.protocol === "https:") return configured.origin;
  } catch {
    // Usa el dominio actual.
  }
  return new URL(request.url).origin;
}

function commonHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "*",
    "x-content-type-options": "nosniff",
  };
}

function jsonHeaders() {
  return {
    ...commonHeaders(),
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
  };
}

function hlsHeaders() {
  return {
    ...commonHeaders(),
    "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
  };
}

function textHeaders() {
  return {
    ...commonHeaders(),
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
  };
}

function jsonResponse(value, status = 200, headOnly = false) {
  return new Response(headOnly ? null : JSON.stringify(value, null, 2), {
    status,
    headers: jsonHeaders(),
  });
}

function textResponse(value, status = 200, headOnly = false, headers = textHeaders()) {
  return new Response(headOnly ? null : value, { status, headers });
}

function resolveUri(uri, baseUrl) {
  const result = new URL(String(uri).trim(), baseUrl);
  if (result.protocol !== "https:" && result.protocol !== "http:") {
    throw new Error("Protocolo no permitido: " + result.protocol);
  }
  return result.href;
}

function parseBandwidth(tag) {
  const match = tag.match(/\bBANDWIDTH\s*=\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function bestVariant(text, baseUrl) {
  const lines = text.split(/\r?\n/);
  const variants = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.toUpperCase().startsWith("#EXT-X-STREAM-INF:")) continue;
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j].trim();
      if (!next) continue;
      if (!next.startsWith("#")) {
        variants.push({ url: resolveUri(next, baseUrl), bandwidth: parseBandwidth(line) });
      }
      break;
    }
  }
  if (!variants.length) throw new Error("Playlist maestra sin variantes");
  variants.sort((a, b) => a.bandwidth - b.bandwidth);
  return variants[variants.length - 1].url;
}

async function fetchM3u8(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, text/plain, */*",
      "User-Agent": "Fenix-HBO-Family/" + WORKER_VERSION,
    },
    cf: { cacheTtl: SOURCE_CACHE_TTL_SECONDS, cacheEverything: true },
  });
  if (!response.ok) throw new Error("HTTP " + response.status + " cargando " + url);
  const text = await response.text();
  if (!text.includes("#EXTM3U")) throw new Error("La fuente no devolvio M3U8");
  return { text, finalUrl: response.url || url };
}

async function hlsDurationSeconds(url, depth = 0) {
  if (depth > 3) throw new Error("Demasiadas playlists maestras encadenadas");
  const loaded = await fetchM3u8(url);
  const baseUrl = new URL(loaded.finalUrl);
  if (/#EXT-X-STREAM-INF:/i.test(loaded.text)) {
    return hlsDurationSeconds(bestVariant(loaded.text, baseUrl), depth + 1);
  }

  let total = 0;
  const regex = /#EXTINF:\s*([0-9]+(?:\.[0-9]+)?)/gi;
  let match;
  while ((match = regex.exec(loaded.text))) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) total += value;
  }
  if (!(total > 0)) throw new Error("No se pudo calcular la duracion HLS");
  return Number(total.toFixed(3));
}

function inferDirectFormat(url) {
  const value = String(url || "").toLowerCase().split("?")[0];
  if (value.endsWith(".mkv")) return "mkv";
  if (value.endsWith(".m3u8")) return "hls";
  if (value.endsWith(".mov") || value.endsWith(".m4v")) return "mp4";
  return "mp4";
}

function normalizeProgramFormat(program) {
  const requested = String(program.streamFormat || inferDirectFormat(program.url)).toLowerCase();
  if (requested === "mp4" || requested === "mkv" || requested === "hls") return requested;
  throw new Error("streamFormat no soportado en " + program.title + ": " + requested);
}

async function resolvedPrograms() {
  const items = [];
  for (const program of PROGRAMS) {
    const streamFormat = normalizeProgramFormat(program);
    let duration = Number(program.durationSeconds || 0);

    // MP4/MKV originales: no se descargan ni inspeccionan desde el Worker.
    // durationSeconds es autoritativo para la grilla lineal y el seek.
    if ((streamFormat === "mp4" || streamFormat === "mkv") && !(duration > 0)) {
      throw new Error("Falta durationSeconds para archivo directo " + program.title);
    }

    // HLS se conserva solo como compatibilidad/fallback para fuentes existentes.
    if (!(duration > 0) && streamFormat === "hls") {
      duration = await hlsDurationSeconds(program.url);
    }
    if (!(duration > 0)) {
      throw new Error("Duracion invalida para " + program.title);
    }

    items.push({ ...program, streamFormat, durationSeconds: duration });
  }
  return items;
}

// ============================================================
// LINEA DE TIEMPO 24/7
// ============================================================

function appendProgramBlock(timeline, program, programIndex, sourceStart, sourceEnd) {
  if (sourceEnd <= sourceStart) return;
  const duration = sourceEnd - sourceStart;
  timeline.blocks.push({
    id: "program-" + programIndex + "-" + sourceStart.toFixed(3),
    kind: "program",
    isCommercial: false,
    programIndex,
    title: program.title,
    description: program.description,
    type: program.type,
    url: program.url,
    streamFormat: program.streamFormat,
    aspectRatio: program.aspectRatio || "16:9",
    sourceStart,
    sourceEnd,
    start: timeline.total,
    end: timeline.total + duration,
    duration,
  });
  timeline.total += duration;
}

function appendCommercialBlock(timeline, programIndex, commercialNumber) {
  timeline.blocks.push({
    id: "commercial-" + programIndex + "-" + commercialNumber,
    kind: "commercial",
    isCommercial: true,
    programIndex,
    title: "Corte comercial",
    description: "Corte comercial Fenix TV.",
    type: "comercial",
    url: "__COMMERCIAL_PLAYLIST__",
    streamFormat: "hls",
    aspectRatio: "16:9",
    sourceStart: 0,
    sourceEnd: COMMERCIAL_DURATION_SECONDS,
    start: timeline.total,
    end: timeline.total + COMMERCIAL_DURATION_SECONDS,
    duration: COMMERCIAL_DURATION_SECONDS,
  });
  timeline.total += COMMERCIAL_DURATION_SECONDS;
}

async function buildTimeline() {
  const programs = await resolvedPrograms();
  const timeline = { programs, blocks: [], programWindows: [], total: 0 };

  for (let programIndex = 0; programIndex < programs.length; programIndex += 1) {
    const program = programs[programIndex];
    const programWallStart = timeline.total;
    let sourceCursor = 0;
    let commercialNumber = 0;

    for (
      let cutAt = COMMERCIAL_INTERVAL_SECONDS;
      cutAt < program.durationSeconds;
      cutAt += COMMERCIAL_INTERVAL_SECONDS
    ) {
      const safeFromStart = cutAt >= PROTECT_START_SECONDS;
      const safeFromEnd = program.durationSeconds - cutAt >= PROTECT_END_SECONDS;
      if (!safeFromStart || !safeFromEnd) continue;

      appendProgramBlock(timeline, program, programIndex, sourceCursor, cutAt);
      commercialNumber += 1;
      appendCommercialBlock(timeline, programIndex, commercialNumber);
      sourceCursor = cutAt;
    }

    appendProgramBlock(
      timeline,
      program,
      programIndex,
      sourceCursor,
      program.durationSeconds,
    );

    timeline.programWindows.push({
      programIndex,
      start: programWallStart,
      end: timeline.total,
      wallDuration: timeline.total - programWallStart,
      contentDuration: program.durationSeconds,
      commercialCount: commercialNumber,
    });
  }

  if (!(timeline.total > 0) || !timeline.blocks.length) {
    throw new Error("La linea de tiempo quedo vacia");
  }

  return timeline;
}

async function getTimeline() {
  const now = Date.now();
  if (timelineCache && now - timelineCacheAt < SCHEDULE_TTL_MS) return timelineCache;
  if (!timelinePromise) {
    timelinePromise = buildTimeline()
      .then((timeline) => {
        timelineCache = timeline;
        timelineCacheAt = Date.now();
        return timeline;
      })
      .finally(() => {
        timelinePromise = null;
      });
  }
  return timelinePromise;
}

function livePosition(timeline, nowSeconds) {
  const elapsed = Math.max(0, nowSeconds - CHANNEL_EPOCH);
  let cycle = Math.floor(elapsed / timeline.total);
  let position = elapsed - cycle * timeline.total;
  if (position >= timeline.total - 0.001) {
    cycle += 1;
    position = 0;
  }

  let index = timeline.blocks.length - 1;
  for (let i = 0; i < timeline.blocks.length; i += 1) {
    const block = timeline.blocks[i];
    if (position >= block.start && position < block.end) {
      index = i;
      break;
    }
  }

  return { cycle, position, blockIndex: index, block: timeline.blocks[index] };
}

function nextProgramIndex(timeline, currentProgramIndex) {
  return (currentProgramIndex + 1) % timeline.programs.length;
}

function iso(seconds) {
  return new Date(seconds * 1000).toISOString();
}

function programOccurrence(timeline, cycle, programIndex) {
  const program = timeline.programs[programIndex];
  const window = timeline.programWindows[programIndex];
  const cycleStart = CHANNEL_EPOCH + cycle * timeline.total;
  return {
    id: program.id,
    title: program.title,
    description: program.description,
    type: program.type,
    isCommercial: false,
    start: iso(cycleStart + window.start),
    end: iso(cycleStart + window.end),
    startSeconds: cycleStart + window.start,
    endSeconds: cycleStart + window.end,
    durationSeconds: Number(window.wallDuration.toFixed(3)),
    contentDurationSeconds: Number(program.durationSeconds.toFixed(3)),
    commercialCount: window.commercialCount,
  };
}

function buildStatus(timeline, state, nowSeconds, baseUrl) {
  const block = state.block;
  const program = timeline.programs[block.programIndex];
  const nextIndex = nextProgramIndex(timeline, block.programIndex);
  const nextCycle = state.cycle + (nextIndex === 0 ? 1 : 0);
  const nowContent = programOccurrence(timeline, state.cycle, block.programIndex);
  const nextContent = programOccurrence(timeline, nextCycle, nextIndex);

  const positionInBlock = Math.max(0, Math.min(block.duration, state.position - block.start));
  let sourcePosition = block.sourceStart + positionInBlock;
  if (block.isCommercial) sourcePosition = 0;

  const progress = Math.max(
    0,
    Math.min(1, sourcePosition / Math.max(0.001, program.durationSeconds)),
  );

  const showNow = !block.isCommercial && sourcePosition < 60;
  const showNext =
    !block.isCommercial && sourcePosition >= Math.max(0, program.durationSeconds - 60);

  return {
    version: WORKER_VERSION,
    id: CHANNEL_ID,
    channel: CHANNEL_NAME,
    playbackMode: "linearDirect",
    generatedAt: new Date().toISOString(),
    cycle: state.cycle,
    positionInCycleSeconds: Number(state.position.toFixed(3)),
    cycleDurationSeconds: Number(timeline.total.toFixed(3)),
    progressPercent: Number((progress * 100).toFixed(2)),

    media: {
      blockId: state.cycle + ":" + block.id,
      kind: block.kind,
      isCommercial: block.isCommercial,
      url: block.isCommercial ? baseUrl + "/commercial.m3u8" : block.url,
      streamFormat: block.streamFormat,
      aspectRatio: block.aspectRatio || "16:9",
      seekSeconds: Number(
        (block.isCommercial ? positionInBlock : block.sourceStart + positionInBlock).toFixed(3),
      ),
      blockPositionSeconds: Number(positionInBlock.toFixed(3)),
      blockDurationSeconds: Number(block.duration.toFixed(3)),
      blockRemainingSeconds: Number(Math.max(0, block.duration - positionInBlock).toFixed(3)),
      sourceStartSeconds: Number(block.sourceStart.toFixed(3)),
      sourceEndSeconds: Number(block.sourceEnd.toFixed(3)),
      contentId: program.id,
      contentTitle: program.title,
      contentDurationSeconds: Number(program.durationSeconds.toFixed(3)),
    },

    nowContent,
    nextContent,

    // Compatibilidad con el overlay que ya usa Fenix TV.
    now: nowContent,
    next: nextContent,
    overlay: {
      showNow,
      showNext,
      nowLabel: "ESTÁS VIENDO",
      nextLabel: "A CONTINUACIÓN",
      nowTitle: program.title,
      nextTitle: timeline.programs[nextIndex].title,
      displaySeconds: 60,
      isCommercial: block.isCommercial,
    },
  };
}

function guideEvents(timeline, fromSeconds, untilSeconds) {
  const events = [];
  const firstCycle = Math.max(
    0,
    Math.floor((fromSeconds - CHANNEL_EPOCH) / timeline.total) - 1,
  );
  const lastCycle = Math.max(
    firstCycle,
    Math.floor((untilSeconds - CHANNEL_EPOCH) / timeline.total) + 1,
  );

  for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
    for (let programIndex = 0; programIndex < timeline.programs.length; programIndex += 1) {
      const event = programOccurrence(timeline, cycle, programIndex);
      if (event.endSeconds <= fromSeconds || event.startSeconds >= untilSeconds) continue;
      events.push({
        start: event.start,
        end: event.end,
        title: event.title,
        description: event.description,
        type: event.type,
        isCommercial: false,
      });
      if (events.length >= MAX_GUIDE_EVENTS) return events;
    }
  }
  return events;
}

function buildChannelJson(baseUrl) {
  return {
    id: CHANNEL_ID,
    enabled: true,
    Title: CHANNEL_NAME,
    Description: CHANNEL_DESCRIPTION,
    CategoryKey: "peliculas",
    CategoryTitle: "Peliculas",
    specialKey: CHANNEL_KEY,
    channelMode: "linearDirect",
    playerStyle: "hbofamily",

    // Url se deja vacio intencionalmente: el reproductor resuelve /status
    // y abre el MP4/MKV original (o HLS compatible) con seek autoritativo.
    Url: "",
    streamFormat: "",

    Logo: CHANNEL_LOGO,
    channelBugUrl: CHANNEL_BUG,
    channelBugOpacity: 0.78,
    channelBugScale: 1.35,
    videoAspectRatio: "16:9",
    programOverlay: true,

    statusUrl: baseUrl + "/status",
    guideUrl: baseUrl + "/guide.json",
    channelJsonUrl: baseUrl + "/channel.json",
    healthUrl: baseUrl + "/health",
  };
}

function commercialPlaylist() {
  return [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "#EXT-X-PLAYLIST-TYPE:VOD",
    "#EXT-X-TARGETDURATION:" + Math.ceil(COMMERCIAL_DURATION_SECONDS),
    "#EXT-X-MEDIA-SEQUENCE:0",
    "#EXTINF:" + COMMERCIAL_DURATION_SECONDS.toFixed(3) + ",",
    COMMERCIAL_TS,
    "#EXT-X-ENDLIST",
    "",
  ].join("\n");
}

// ============================================================
// HTTP
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const headOnly = request.method === "HEAD";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: commonHeaders() });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return textResponse("Metodo no permitido", 405, headOnly, {
        ...textHeaders(),
        allow: "GET, HEAD, OPTIONS",
      });
    }

    try {
      const baseUrl = publicBaseUrl(request, env);
      const timeline = await getTimeline();
      const nowSeconds = Date.now() / 1000;
      const state = livePosition(timeline, nowSeconds);
      const status = buildStatus(timeline, state, nowSeconds, baseUrl);

      if (path === "/") {
        return jsonResponse(
          {
            service: "hbo-family-linear-direct-worker",
            version: WORKER_VERSION,
            channel: CHANNEL_NAME,
            playbackMode: "linearDirect",
            mensaje: "Canal lineal por MP4/MKV originales + seek sincronizado.",
            status: baseUrl + "/status",
            guide: baseUrl + "/guide.json",
            channelJson: baseUrl + "/channel.json",
            catalog: baseUrl + "/catalog.json",
            commercial: baseUrl + "/commercial.m3u8",
          },
          200,
          headOnly,
        );
      }

      if (path === "/status" || path === "/play-state.json") {
        return jsonResponse(status, 200, headOnly);
      }

      if (path === "/channel.json") {
        return jsonResponse(buildChannelJson(baseUrl), 200, headOnly);
      }

      if (path === "/catalog.json") {
        return jsonResponse({ linearChannels: [buildChannelJson(baseUrl)] }, 200, headOnly);
      }

      if (path === "/guide.json" || path === "/epg.json") {
        return jsonResponse(
          {
            id: CHANNEL_ID,
            channel: CHANNEL_NAME,
            playbackMode: "linearDirect",
            generatedAt: new Date().toISOString(),
            now: status.nowContent,
            next: status.nextContent,
            progressPercent: status.progressPercent,
            epg: guideEvents(
              timeline,
              nowSeconds - GUIDE_PAST_DAYS * 86400,
              nowSeconds + GUIDE_FUTURE_DAYS * 86400,
            ),
          },
          200,
          headOnly,
        );
      }

      if (path === "/commercial.m3u8") {
        return textResponse(commercialPlaylist(), 200, headOnly, hlsHeaders());
      }

      // Ruta antigua: ya no se utiliza. Se devuelve informacion clara para
      // evitar que una app vieja crea que sigue siendo un HLS lineal completo.
      if (path === "/live.m3u8") {
        return jsonResponse(
          {
            success: false,
            migrated: true,
            playbackMode: "linearDirect",
            message: "Este canal lineal directo se resuelve mediante /status.",
            statusUrl: baseUrl + "/status",
            channelJsonUrl: baseUrl + "/channel.json",
          },
          410,
          headOnly,
        );
      }

      if (path === "/health") {
        return jsonResponse(
          {
            success: true,
            version: WORKER_VERSION,
            playbackMode: "linearDirect",
            programCount: timeline.programs.length,
            blockCount: timeline.blocks.length,
            cycleDurationSeconds: Number(timeline.total.toFixed(3)),
            commercialEveryMinutes: COMMERCIAL_INTERVAL_SECONDS / 60,
            commercialDurationSeconds: COMMERCIAL_DURATION_SECONDS,
            protectedStartSeconds: PROTECT_START_SECONDS,
            protectedEndSeconds: PROTECT_END_SECONDS,
            programs: timeline.programs.map((program, index) => ({
              id: program.id,
              title: program.title,
              streamFormat: program.streamFormat,
              durationSeconds: Number(program.durationSeconds.toFixed(3)),
              commercialCount: timeline.programWindows[index].commercialCount,
            })),
          },
          200,
          headOnly,
        );
      }

      return jsonResponse({ success: false, error: "Ruta no encontrada." }, 404, headOnly);
    } catch (error) {
      console.error("HBO FAMILY HD Worker error", error);
      return jsonResponse(
        { success: false, error: "Error generando el canal: " + errorText(error) },
        502,
        headOnly,
      );
    }
  },
};

export const __test = {
  buildTimeline,
  livePosition,
  buildStatus,
  guideEvents,
};
