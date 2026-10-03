// ============================================================
// FÉNIX TV — MULTICHANNEL LINEAR DIRECT WORKER v3.0
// MP4 / MKV / HLS + REMOTE channels.json + EPG + NOW/NEXT
// ============================================================

const WORKER_VERSION = "3.0.0-multichannel-remote-config";

// Puedes cambiarla con la variable CHANNELS_CONFIG_URL del Worker.
// Si este archivo no existe todavía, el Worker usa la configuración embebida.
const DEFAULT_REMOTE_CONFIG_URL =
  "https://pub-31c3df763d1f4f2bbd2602595581aa82.r2.dev/fenix-config/channels.json";

// Catálogo actual de Fénix TV. /catalog.json lo conserva y solamente reemplaza
// los canales administrados por channels.json. Se puede cambiar con
// UPSTREAM_CATALOG_URL.
const DEFAULT_UPSTREAM_CATALOG_URL =
  "https://raw.githubusercontent.com/ELMANIU/Roku-feed/main/catalog.json";

const CONFIG_TTL_MS = 20 * 1000;
const UPSTREAM_TTL_MS = 30 * 1000;
const TIMELINE_TTL_MS = 20 * 1000;
const SOURCE_CACHE_TTL_SECONDS = 60 * 60;
const GUIDE_PAST_DAYS = 1;
const GUIDE_FUTURE_DAYS = 7;
const MAX_GUIDE_EVENTS = 5000;
const DEFAULT_QUEUE_HORIZON_SECONDS = 48 * 60 * 60;
const DEFAULT_CHANNEL_KEY = "hbofamily";

const FALLBACK_CONFIG = {"schemaVersion":1,"configVersion":"2026-10-03.1","updatedAt":"2026-10-03T21:12:00Z","channels":{"hbofamily":{"enabled":true,"id":"hbo-family-hd","name":"HBO FAMILY HD","description":"Películas y series familiares en señal lineal 24/7.","categoryKey":"peliculas","categoryTitle":"Películas","specialKey":"hbofamily","playerStyle":"hbofamily","epoch":1790899200,"logo":"https://dl.dropbox.com/scl/fi/lc6b4gg1twqumr4vrakqj/file_00000000ea5081f5ae4dbb5801f12815.png?rlkey=m6w76492cyq0z12lx91mgo31b&st=kq7ilsda&dl=0","channelBugUrl":"https://dl.dropbox.com/scl/fi/wfvxs2ld2nkrw2p5mvxr4/file_00000000875881f5b8eb4726d70d23c3.png?rlkey=hdpi75re6qn1ehrhq446ps2zr&st=r6ak8axz&dl=0","channelBugOpacity":0.78,"channelBugScale":1.55,"videoAspectRatio":"16:9","programOverlay":true,"queueHorizonSeconds":172800,"commercial":{"enabled":true,"url":"https://pub-31c3df763d1f4f2bbd2602595581aa82.r2.dev/FenixTV_COMERCIAL_REAL_1m30_ROKU_1080p_OPTIMIZADO_TEXTO_CORREGIDO.mp4","streamFormat":"mp4","durationSeconds":90,"intervalSeconds":900,"protectStartSeconds":60,"protectEndSeconds":60,"betweenPrograms":false,"legacyTsUrl":"https://hugh.cdn.rumble.cloud/video/fwe2/a0/s8/2/Y/B/T/2/YBT2A.aaa.ts"},"programs":[{"id":"shrek-1","title":"Shrek","description":"Película familiar en español latino.","type":"pelicula","url":"https://hugh.cdn.rumble.cloud/video/fwe2/40/s8/2/e/s/0/2/es02A.aaa.mp4","streamFormat":"mp4","durationSeconds":5466,"aspectRatio":"16:9","enabled":true},{"id":"shrek-2","title":"Shrek 2","description":"Película familiar en español latino.","type":"pelicula","url":"https://hugh.cdn.rumble.cloud/video/fwe2/50/s8/2/q/6/9/2/q692A.aaa.mp4","streamFormat":"mp4","durationSeconds":5558,"aspectRatio":"16:9","enabled":true},{"id":"kung-fu-panda-3","title":"Kung Fu Panda 3","description":"Película familiar de DreamWorks (2016) en español latino.","type":"pelicula","url":"https://hugh.cdn.rumble.cloud/video/fww1/be/s8/2/I/x/q/3/Ixq3A.aaa.mp4","streamFormat":"mp4","durationSeconds":5694,"aspectRatio":"16:9","enabled":true},{"id":"chicas-superpoderosas-s01e01","title":"Las Chicas Superpoderosas — Simono dice... / Un toque femenino","description":"Temporada 1 · Episodio 1 · Español latino","type":"serie","url":"https://hugh.cdn.rumble.cloud/video/fww1/3d/s8/2/G/b/-/2/Gb-2A.aaa.mp4","streamFormat":"mp4","durationSeconds":1364,"aspectRatio":"4:3","enabled":true},{"id":"chicas-superpoderosas-s01e02","title":"Las Chicas Superpoderosas — El insecto que llevamos dentro / Doble personalidad","description":"Temporada 1 · Episodio 2 · Español latino","type":"serie","url":"https://hugh.cdn.rumble.cloud/video/fwe2/e3/s8/2/A/d/-/2/Ad-2A.aaa.mp4","streamFormat":"mp4","durationSeconds":1364,"aspectRatio":"4:3","enabled":true},{"id":"chicas-superpoderosas-s01e03","title":"Las Chicas Superpoderosas — El pulpo del mal / Problemas","description":"Temporada 1 · Episodio 3 · Español latino","type":"serie","url":"https://hugh.cdn.rumble.cloud/video/fww1/88/s8/2/0/f/-/2/0f-2A.aaa.mp4","streamFormat":"mp4","durationSeconds":1355,"aspectRatio":"4:3","enabled":true},{"id":"tom-y-jerry-la-pelicula","title":"Tom y Jerry: La película","description":"Película familiar en español latino.","type":"pelicula","url":"https://hugh.cdn.rumble.cloud/video/fwe2/f7/s8/2/I/x/-/2/Ix-2A.aaa.mp4","streamFormat":"mp4","durationSeconds":6065,"aspectRatio":"16:9","enabled":true},{"id":"los-croods","title":"Los Croods","description":"Película familiar en español latino.","type":"pelicula","url":"https://hugh.cdn.rumble.cloud/video/fwe2/25/s8/2/I/s/p/3/Isp3A.aaa.mkv","streamFormat":"mkv","durationSeconds":5917,"aspectRatio":"16:9","enabled":true}]}}};

let configCache = null;
let configCacheAt = 0;
let configPromise = null;
let upstreamCache = null;
let upstreamCacheAt = 0;
let upstreamPromise = null;
const timelineCache = new Map();

// ============================================================
// RESPUESTAS / UTILIDADES
// ============================================================

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}

function normalizePath(pathname) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function publicBaseUrl(request, env) {
  try {
    const configured = new URL(String(env.PUBLIC_BASE_URL || ""));
    if (configured.protocol === "https:") return configured.origin;
  } catch {}
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

function textHeaders(contentType = "text/plain; charset=utf-8") {
  return {
    ...commonHeaders(),
    "content-type": contentType,
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
  };
}

function jsonResponse(value, status = 200, headOnly = false) {
  return new Response(headOnly ? null : JSON.stringify(value, null, 2), {
    status,
    headers: jsonHeaders(),
  });
}

function textResponse(value, status = 200, headOnly = false, contentType) {
  return new Response(headOnly ? null : value, {
    status,
    headers: textHeaders(contentType),
  });
}

function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function boolValue(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (["true", "1", "yes", "si", "sí"].includes(s)) return true;
    if (["false", "0", "no"].includes(s)) return false;
  }
  return fallback;
}

function stringValue(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s || fallback;
}

function slug(value) {
  return stringValue(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function iso(seconds) {
  return new Date(seconds * 1000).toISOString();
}

function inferFormat(url) {
  const value = stringValue(url).toLowerCase().split("?")[0];
  if (value.endsWith(".mkv")) return "mkv";
  if (value.endsWith(".m3u8")) return "hls";
  if (value.endsWith(".m4v") || value.endsWith(".mov")) return "mp4";
  return "mp4";
}

async function shortHash(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 10)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

// ============================================================
// CONFIGURACIÓN REMOTA
// ============================================================

async function fetchJsonText(url, userAgent, cacheSeconds = 0, extraHeaders = {}) {
  const headers = {
    Accept: "application/json, text/plain, */*",
    "Cache-Control": "no-cache, no-store, max-age=0",
    Pragma: "no-cache",
    "User-Agent": userAgent,
    ...extraHeaders,
  };

  const options = { headers };
  if (cacheSeconds > 0) {
    options.cf = { cacheTtl: cacheSeconds, cacheEverything: true };
  }

  const response = await fetch(url, options);
  if (!response.ok) throw new Error("HTTP " + response.status + " cargando " + url);
  const text = await response.text();
  const parsed = JSON.parse(text);
  return { parsed, text, finalUrl: response.url || url };
}

function rawChannels(config) {
  if (!config || typeof config !== "object") return [];
  if (Array.isArray(config.channels)) {
    return config.channels.map((channel, index) => [channel.key || channel.slug || "channel-" + index, channel]);
  }
  if (config.channels && typeof config.channels === "object") {
    return Object.entries(config.channels);
  }
  return [];
}

function normalizeProgram(raw, index) {
  if (!raw || typeof raw !== "object") return null;
  if (!boolValue(raw.enabled, true)) return null;

  const url = stringValue(raw.url || raw.Url || raw.Stream || raw.streamUrl);
  if (!url) return null;

  const title = stringValue(raw.title || raw.Title || raw.name || raw.nombre, "Programa " + (index + 1));
  const streamFormat = stringValue(raw.streamFormat || raw.format, inferFormat(url)).toLowerCase();
  const durationSeconds = numberValue(raw.durationSeconds || raw.Duration || raw.duration, 0);

  if (!["mp4", "mkv", "hls"].includes(streamFormat)) {
    throw new Error("streamFormat no soportado en " + title + ": " + streamFormat);
  }

  return {
    id: stringValue(raw.id, slug(title) || "program-" + index),
    title,
    description: stringValue(raw.description || raw.Description || raw.descripcion, title),
    type: stringValue(raw.type || raw.tipo, "pelicula"),
    url,
    streamFormat,
    durationSeconds,
    aspectRatio: stringValue(raw.aspectRatio, "16:9"),
  };
}

function normalizeChannel(keyHint, raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!boolValue(raw.enabled, true)) return null;

  const key = slug(raw.key || raw.slug || raw.specialKey || keyHint);
  if (!key) throw new Error("Canal sin key válido");

  const name = stringValue(raw.name || raw.Title || raw.title || raw.nombre, key);
  const id = stringValue(raw.id || raw.contentId, key);
  const schedule = raw.schedule && typeof raw.schedule === "object" ? raw.schedule : {};
  const programSource = raw.programs || schedule.programs || schedule.movies || schedule.items || [];
  const programs = Array.isArray(programSource)
    ? programSource.map(normalizeProgram).filter(Boolean)
    : [];

  const commercialRaw = raw.commercial && typeof raw.commercial === "object"
    ? raw.commercial
    : (schedule.commercial && typeof schedule.commercial === "object" ? schedule.commercial : {});

  const commercialUrl = stringValue(
    commercialRaw.url || schedule.commercialUrl || raw.commercialUrl,
    "",
  );
  const commercialDuration = numberValue(
    commercialRaw.durationSeconds || schedule.adDuration || schedule.commercialDuration || raw.commercialDuration,
    0,
  );
  const commercialInterval = numberValue(
    commercialRaw.intervalSeconds || schedule.adInterval || schedule.adIntervalSeconds || raw.adInterval,
    0,
  );

  return {
    key,
    id,
    name,
    description: stringValue(raw.description || raw.Description || raw.descripcion, "Canal lineal 24/7."),
    categoryKey: stringValue(raw.categoryKey || raw.CategoryKey, "24_7"),
    categoryTitle: stringValue(raw.categoryTitle || raw.CategoryTitle, "24/7"),
    specialKey: stringValue(raw.specialKey, key),
    playerStyle: stringValue(raw.playerStyle, "generic247"),
    epoch: numberValue(raw.epoch || raw.linearAnchor || schedule.epoch || schedule.linearAnchor, 0),
    logo: stringValue(raw.logo || raw.Logo, ""),
    channelBugUrl: stringValue(raw.channelBugUrl || raw.bugUrl || raw.logoBug, ""),
    channelBugOpacity: numberValue(raw.channelBugOpacity || raw.bugOpacity, 0.78),
    channelBugScale: numberValue(raw.channelBugScale || raw.bugScale, 1.3),
    channelBugWidth: numberValue(raw.channelBugWidth || raw.bugWidth, 0),
    channelBugHeight: numberValue(raw.channelBugHeight || raw.bugHeight, 0),
    videoAspectRatio: stringValue(raw.videoAspectRatio || raw.aspectRatio, "16:9"),
    programOverlay: boolValue(raw.programOverlay, true),
    queueHorizonSeconds: Math.max(
      6 * 3600,
      Math.min(72 * 3600, numberValue(raw.queueHorizonSeconds || schedule.queueHorizonSeconds, DEFAULT_QUEUE_HORIZON_SECONDS)),
    ),
    commercial: {
      enabled: boolValue(commercialRaw.enabled, commercialUrl !== "" && commercialDuration > 0),
      url: commercialUrl,
      streamFormat: stringValue(commercialRaw.streamFormat, inferFormat(commercialUrl || ".mp4")).toLowerCase(),
      durationSeconds: commercialDuration,
      intervalSeconds: commercialInterval,
      protectStartSeconds: numberValue(commercialRaw.protectStartSeconds, 60),
      protectEndSeconds: numberValue(commercialRaw.protectEndSeconds, 60),
      betweenPrograms: boolValue(commercialRaw.betweenPrograms, false),
      legacyTsUrl: stringValue(commercialRaw.legacyTsUrl, ""),
    },
    programs,
  };
}

function normalizeConfig(raw) {
  const channels = [];
  for (const [key, value] of rawChannels(raw)) {
    const channel = normalizeChannel(key, value);
    if (channel) channels.push(channel);
  }

  if (!channels.length) throw new Error("channels.json no contiene canales habilitados");
  for (const channel of channels) {
    if (!(channel.epoch > 0)) throw new Error("Falta epoch/linearAnchor en " + channel.name);
    if (!channel.programs.length) throw new Error("No hay programas en " + channel.name);
  }

  return {
    schemaVersion: numberValue(raw.schemaVersion, 1),
    configVersion: stringValue(raw.configVersion || raw.version, "1"),
    updatedAt: stringValue(raw.updatedAt, ""),
    channels,
  };
}

async function loadConfig(env) {
  const now = Date.now();
  if (configCache && now - configCacheAt < CONFIG_TTL_MS) return configCache;
  if (configPromise) return configPromise;

  configPromise = (async () => {
    const disableRemote = String(env.DISABLE_REMOTE_CONFIG || "") === "1";
    const configuredUrl = stringValue(env.CHANNELS_CONFIG_URL, DEFAULT_REMOTE_CONFIG_URL);

    if (!disableRemote && configuredUrl) {
      try {
        const headers = {};
        if (env.CONFIG_BEARER_TOKEN) headers.Authorization = "Bearer " + String(env.CONFIG_BEARER_TOKEN);
        const loaded = await fetchJsonText(
          configuredUrl,
          "FenixTV-Multichannel/" + WORKER_VERSION,
          0,
          headers,
        );
        const normalized = normalizeConfig(loaded.parsed);
        const revision = normalized.configVersion + "-" + (await shortHash(loaded.text));
        return {
          ...normalized,
          revision,
          source: loaded.finalUrl,
          remote: true,
          warning: "",
        };
      } catch (error) {
        console.warn("Remote channels.json unavailable; using fallback", errorText(error));
        if (String(env.REQUIRE_REMOTE_CONFIG || "") === "1") throw error;
        const fallback = normalizeConfig(FALLBACK_CONFIG);
        return {
          ...fallback,
          revision: "fallback-" + fallback.configVersion,
          source: "embedded-fallback",
          remote: false,
          warning: errorText(error),
        };
      }
    }

    const fallback = normalizeConfig(FALLBACK_CONFIG);
    return {
      ...fallback,
      revision: "fallback-" + fallback.configVersion,
      source: "embedded-fallback",
      remote: false,
      warning: disableRemote ? "remote config disabled" : "",
    };
  })()
    .then((value) => {
      if (!configCache || configCache.revision !== value.revision) timelineCache.clear();
      configCache = value;
      configCacheAt = Date.now();
      return value;
    })
    .finally(() => {
      configPromise = null;
    });

  return configPromise;
}

function findChannel(config, key) {
  const wanted = slug(key);
  return config.channels.find((channel) =>
    channel.key === wanted ||
    slug(channel.id) === wanted ||
    slug(channel.specialKey) === wanted
  ) || null;
}

// ============================================================
// HLS OPCIONAL: CÁLCULO DE DURACIÓN SI NO SE DECLARÓ
// ============================================================

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
      "User-Agent": "FenixTV-Multichannel/" + WORKER_VERSION,
    },
    cf: { cacheTtl: SOURCE_CACHE_TTL_SECONDS, cacheEverything: true },
  });
  if (!response.ok) throw new Error("HTTP " + response.status + " cargando " + url);
  const text = await response.text();
  if (!text.includes("#EXTM3U")) throw new Error("La fuente no devolvió M3U8");
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
  if (!(total > 0)) throw new Error("No se pudo calcular la duración HLS");
  return Number(total.toFixed(3));
}

async function resolvedPrograms(channel) {
  const items = [];
  for (const program of channel.programs) {
    let duration = numberValue(program.durationSeconds, 0);
    if ((program.streamFormat === "mp4" || program.streamFormat === "mkv") && !(duration > 0)) {
      throw new Error("Falta durationSeconds para " + program.title + " en " + channel.name);
    }
    if (!(duration > 0) && program.streamFormat === "hls") {
      duration = await hlsDurationSeconds(program.url);
    }
    if (!(duration > 0)) throw new Error("Duración inválida para " + program.title);
    items.push({ ...program, durationSeconds: duration });
  }
  return items;
}

// ============================================================
// MOTOR LINEAL POR CANAL
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

function appendCommercialBlock(timeline, channel, programIndex, commercialNumber) {
  const commercial = channel.commercial;
  if (!commercial.enabled || !commercial.url || !(commercial.durationSeconds > 0)) return;
  timeline.blocks.push({
    id: "commercial-" + programIndex + "-" + commercialNumber,
    kind: "commercial",
    isCommercial: true,
    programIndex,
    title: "Corte comercial",
    description: "Corte comercial Fénix TV.",
    type: "comercial",
    url: commercial.url,
    streamFormat: commercial.streamFormat || inferFormat(commercial.url),
    aspectRatio: "16:9",
    sourceStart: 0,
    sourceEnd: commercial.durationSeconds,
    start: timeline.total,
    end: timeline.total + commercial.durationSeconds,
    duration: commercial.durationSeconds,
  });
  timeline.total += commercial.durationSeconds;
}

async function buildTimeline(channel) {
  const programs = await resolvedPrograms(channel);
  const timeline = { channelKey: channel.key, programs, blocks: [], programWindows: [], total: 0 };
  const commercial = channel.commercial;
  const intervalEnabled = commercial.enabled && commercial.url && commercial.durationSeconds > 0 && commercial.intervalSeconds > 0;

  for (let programIndex = 0; programIndex < programs.length; programIndex += 1) {
    const program = programs[programIndex];
    const programWallStart = timeline.total;
    let sourceCursor = 0;
    let commercialNumber = 0;

    if (intervalEnabled) {
      for (
        let cutAt = commercial.intervalSeconds;
        cutAt < program.durationSeconds;
        cutAt += commercial.intervalSeconds
      ) {
        const safeFromStart = cutAt >= commercial.protectStartSeconds;
        const safeFromEnd = program.durationSeconds - cutAt >= commercial.protectEndSeconds;
        if (!safeFromStart || !safeFromEnd) continue;

        appendProgramBlock(timeline, program, programIndex, sourceCursor, cutAt);
        commercialNumber += 1;
        appendCommercialBlock(timeline, channel, programIndex, commercialNumber);
        sourceCursor = cutAt;
      }
    }

    appendProgramBlock(timeline, program, programIndex, sourceCursor, program.durationSeconds);

    if (
      commercial.enabled &&
      commercial.betweenPrograms &&
      commercial.url &&
      commercial.durationSeconds > 0
    ) {
      commercialNumber += 1;
      appendCommercialBlock(timeline, channel, programIndex, commercialNumber);
    }

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
    throw new Error("La línea de tiempo quedó vacía para " + channel.name);
  }
  return timeline;
}

async function getTimeline(config, channel) {
  const cacheKey = config.revision + ":" + channel.key;
  const now = Date.now();
  const cached = timelineCache.get(cacheKey);
  if (cached && now - cached.at < TIMELINE_TTL_MS) return cached.timeline;

  const timeline = await buildTimeline(channel);
  timelineCache.set(cacheKey, { at: Date.now(), timeline });

  // Limpia revisiones antiguas sin crecer indefinidamente.
  if (timelineCache.size > Math.max(8, config.channels.length * 3)) {
    for (const key of Array.from(timelineCache.keys())) {
      if (!key.startsWith(config.revision + ":")) timelineCache.delete(key);
    }
  }
  return timeline;
}

function livePosition(channel, timeline, nowSeconds) {
  const elapsed = Math.max(0, nowSeconds - channel.epoch);
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

function programOccurrence(channel, timeline, cycle, programIndex) {
  const program = timeline.programs[programIndex];
  const window = timeline.programWindows[programIndex];
  const cycleStart = channel.epoch + cycle * timeline.total;
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

function buildStatus(config, channel, timeline, state, nowSeconds, baseUrl) {
  const block = state.block;
  const program = timeline.programs[block.programIndex];
  const nextIndex = nextProgramIndex(timeline, block.programIndex);
  const nextCycle = state.cycle + (nextIndex === 0 ? 1 : 0);
  const nowContent = programOccurrence(channel, timeline, state.cycle, block.programIndex);
  const nextContent = programOccurrence(channel, timeline, nextCycle, nextIndex);

  const positionInBlock = Math.max(0, Math.min(block.duration, state.position - block.start));
  let sourcePosition = block.sourceStart + positionInBlock;
  if (block.isCommercial) sourcePosition = block.sourceStart;

  const progress = Math.max(0, Math.min(1, sourcePosition / Math.max(0.001, program.durationSeconds)));
  const showNow = !block.isCommercial && sourcePosition < 60;
  const showNext = !block.isCommercial && sourcePosition >= Math.max(0, program.durationSeconds - 60);

  return {
    version: WORKER_VERSION,
    configRevision: config.revision,
    id: channel.id,
    key: channel.key,
    channel: channel.name,
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
      url: block.url,
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
    urls: {
      status: baseUrl + "/channel/" + channel.key + "/status",
      queue: baseUrl + "/channel/" + channel.key + "/status?queue=1",
      guide: baseUrl + "/channel/" + channel.key + "/guide.json",
    },
  };
}

function buildPlaybackQueue(channel, timeline, state) {
  const queue = [];
  if (!timeline.blocks.length) return queue;

  let blockIndex = state.blockIndex;
  let cycle = state.cycle;
  let queuedSeconds = 0;
  let first = true;
  const maxItems = 900;

  while (queuedSeconds < channel.queueHorizonSeconds && queue.length < maxItems) {
    const block = timeline.blocks[blockIndex];
    const program = timeline.programs[block.programIndex];
    let positionInBlock = 0;
    if (first) positionInBlock = Math.max(0, Math.min(block.duration, state.position - block.start));

    const playStartSeconds = block.isCommercial
      ? positionInBlock
      : block.sourceStart + positionInBlock;
    const remaining = Math.max(0.001, block.duration - positionInBlock);
    const nextProgram = timeline.programs[nextProgramIndex(timeline, block.programIndex)];

    queue.push({
      blockId: cycle + ":" + block.id,
      role: block.isCommercial ? "ad" : "movie",
      channelRole: block.isCommercial ? "ad" : "content",
      kind: block.kind,
      isCommercial: block.isCommercial,
      title: block.isCommercial ? "Corte comercial" : program.title,
      description: block.isCommercial ? "Corte comercial Fénix TV." : program.description,
      contentTitle: program.title,
      nextTitle: nextProgram ? nextProgram.title : "",
      url: block.url,
      streamFormat: block.streamFormat,
      aspectRatio: block.aspectRatio || program.aspectRatio || "16:9",
      clipStartSeconds: Number(block.sourceStart.toFixed(3)),
      clipEndSeconds: Number(block.sourceEnd.toFixed(3)),
      playStartSeconds: Number(playStartSeconds.toFixed(3)),
      durationSeconds: Number(remaining.toFixed(3)),
      blockDurationSeconds: Number(block.duration.toFixed(3)),
      contentDurationSeconds: Number(program.durationSeconds.toFixed(3)),
      cycle,
    });

    queuedSeconds += remaining;
    first = false;
    blockIndex += 1;
    if (blockIndex >= timeline.blocks.length) {
      blockIndex = 0;
      cycle += 1;
    }
  }
  return queue;
}

function guideEvents(channel, timeline, fromSeconds, untilSeconds) {
  const events = [];
  const firstCycle = Math.max(0, Math.floor((fromSeconds - channel.epoch) / timeline.total) - 1);
  const lastCycle = Math.max(firstCycle, Math.floor((untilSeconds - channel.epoch) / timeline.total) + 1);

  for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
    for (let programIndex = 0; programIndex < timeline.programs.length; programIndex += 1) {
      const event = programOccurrence(channel, timeline, cycle, programIndex);
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

function buildChannelJson(channel, baseUrl, status = null) {
  const root = baseUrl + "/channel/" + channel.key;
  const item = {
    id: channel.id,
    contentId: channel.id,
    enabled: true,
    Title: channel.name,
    Description: channel.description,
    CategoryKey: channel.categoryKey,
    CategoryTitle: channel.categoryTitle,
    specialKey: channel.specialKey,
    channelMode: "linearDirect",
    playerStyle: channel.playerStyle,
    linearAnchor: channel.epoch,
    Logo: channel.logo,
    channelBugUrl: channel.channelBugUrl,
    channelBugOpacity: channel.channelBugOpacity,
    channelBugScale: channel.channelBugScale,
    videoAspectRatio: channel.videoAspectRatio,
    programOverlay: channel.programOverlay,
    Url: "",
    streamFormat: "",
    statusUrl: root + "/status",
    queueStatusUrl: root + "/status?queue=1",
    guideUrl: root + "/guide.json",
    epgUrl: root + "/epg.json",
    channelJsonUrl: root + "/channel.json",
    healthUrl: root + "/health",
  };
  if (channel.channelBugWidth > 0) item.channelBugWidth = channel.channelBugWidth;
  if (channel.channelBugHeight > 0) item.channelBugHeight = channel.channelBugHeight;
  if (status) {
    item.nowContent = status.nowContent;
    item.nextContent = status.nextContent;
    item.progressPercent = status.progressPercent;
    item.overlay = status.overlay;
    item.tagline = "AHORA: " + status.nowContent.title + " · DESPUÉS: " + status.nextContent.title;
  } else {
    item.tagline = channel.name;
  }
  return item;
}

function commercialPlaylist(channel) {
  const commercial = channel.commercial;
  if (!commercial.legacyTsUrl || !(commercial.durationSeconds > 0)) return null;
  return [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "#EXT-X-PLAYLIST-TYPE:VOD",
    "#EXT-X-TARGETDURATION:" + Math.ceil(commercial.durationSeconds),
    "#EXT-X-MEDIA-SEQUENCE:0",
    "#EXTINF:" + commercial.durationSeconds.toFixed(3) + ",",
    commercial.legacyTsUrl,
    "#EXT-X-ENDLIST",
    "",
  ].join("\n");
}

// ============================================================
// CATÁLOGO COMPLETO: conserva películas/series/TV actual + canales gestionados
// ============================================================

async function loadUpstreamCatalog(env) {
  const now = Date.now();
  if (upstreamCache && now - upstreamCacheAt < UPSTREAM_TTL_MS) return upstreamCache;
  if (upstreamPromise) return upstreamPromise;

  upstreamPromise = (async () => {
    if (String(env.DISABLE_UPSTREAM_CATALOG || "") === "1") {
      return { schemaVersion: 1, movies: [], series: [], tvCategories: [], linearChannels: [] };
    }
    const url = stringValue(env.UPSTREAM_CATALOG_URL, DEFAULT_UPSTREAM_CATALOG_URL);
    try {
      const loaded = await fetchJsonText(url, "FenixTV-CatalogMerge/" + WORKER_VERSION, 0);
      return loaded.parsed;
    } catch (error) {
      console.warn("Upstream catalog unavailable", errorText(error));
      return {
        schemaVersion: 1,
        replaceLocalMovies: false,
        replaceLocalSeries: false,
        replaceLocalTv: false,
        movies: [],
        series: [],
        tvCategories: [],
        linearChannels: [],
        upstreamWarning: errorText(error),
      };
    }
  })()
    .then((value) => {
      upstreamCache = value;
      upstreamCacheAt = Date.now();
      return value;
    })
    .finally(() => {
      upstreamPromise = null;
    });

  return upstreamPromise;
}

function channelIdentity(item) {
  if (!item || typeof item !== "object") return [];
  return [
    slug(item.id),
    slug(item.contentId),
    slug(item.specialKey),
    slug(item.Title || item.title || item.name),
  ].filter(Boolean);
}

function isManagedChannel(item, managed) {
  const itemIds = new Set(channelIdentity(item));
  for (const channel of managed) {
    const ids = [slug(channel.id), slug(channel.key), slug(channel.specialKey), slug(channel.name)].filter(Boolean);
    if (ids.some((id) => itemIds.has(id))) return true;
  }
  return false;
}

async function buildMergedCatalog(request, env, config) {
  const baseUrl = publicBaseUrl(request, env);
  const upstream = deepClone(await loadUpstreamCatalog(env));
  const managed = config.channels;

  // Evita ciclo si el catálogo de GitHub se usa como bootstrap hacia este Worker.
  delete upstream.catalogUrl;

  if (!Array.isArray(upstream.linearChannels)) upstream.linearChannels = [];
  upstream.linearChannels = upstream.linearChannels.filter((item) => !isManagedChannel(item, managed));

  if (Array.isArray(upstream.tvCategories)) {
    for (const category of upstream.tvCategories) {
      if (category && Array.isArray(category.Channels)) {
        category.Channels = category.Channels.filter((item) => !isManagedChannel(item, managed));
      }
    }
  } else {
    upstream.tvCategories = [];
  }

  const nowSeconds = Date.now() / 1000;
  for (const channel of managed) {
    const timeline = await getTimeline(config, channel);
    const state = livePosition(channel, timeline, nowSeconds);
    const status = buildStatus(config, channel, timeline, state, nowSeconds, baseUrl);
    upstream.linearChannels.push(buildChannelJson(channel, baseUrl, status));
  }

  upstream.schemaVersion = numberValue(upstream.schemaVersion, 1);
  upstream.updatedAt = new Date().toISOString();
  upstream.fenixMultichannelWorker = {
    version: WORKER_VERSION,
    configRevision: config.revision,
    configSource: config.source,
    channelCount: managed.length,
  };
  return upstream;
}

// ============================================================
// ROUTING POR CANAL
// ============================================================

function parseChannelRoute(path) {
  const match = path.match(/^\/channel\/([^/]+)(\/.*)?$/i);
  if (!match) return null;
  return {
    key: decodeURIComponent(match[1]),
    subpath: normalizePath(match[2] || "/"),
  };
}

async function channelResponse(request, env, config, channel, subpath, headOnly) {
  const baseUrl = publicBaseUrl(request, env);
  const timeline = await getTimeline(config, channel);
  const nowSeconds = Date.now() / 1000;
  const state = livePosition(channel, timeline, nowSeconds);
  const status = buildStatus(config, channel, timeline, state, nowSeconds, baseUrl);
  const url = new URL(request.url);

  if (subpath === "/" || subpath === "/status" || subpath === "/play-state.json") {
    if (url.searchParams.get("queue") === "1") {
      status.queue = buildPlaybackQueue(channel, timeline, state);
      status.queueHorizonSeconds = channel.queueHorizonSeconds;
      status.queueItemCount = status.queue.length;
    }
    return jsonResponse(status, 200, headOnly);
  }

  if (subpath === "/channel.json") {
    return jsonResponse(buildChannelJson(channel, baseUrl, status), 200, headOnly);
  }

  if (subpath === "/guide.json" || subpath === "/epg.json") {
    return jsonResponse({
      id: channel.id,
      key: channel.key,
      channel: channel.name,
      playbackMode: "linearDirect",
      generatedAt: new Date().toISOString(),
      now: status.nowContent,
      next: status.nextContent,
      progressPercent: status.progressPercent,
      epg: guideEvents(
        channel,
        timeline,
        nowSeconds - GUIDE_PAST_DAYS * 86400,
        nowSeconds + GUIDE_FUTURE_DAYS * 86400,
      ),
    }, 200, headOnly);
  }

  if (subpath === "/health") {
    return jsonResponse({
      success: true,
      version: WORKER_VERSION,
      configRevision: config.revision,
      key: channel.key,
      id: channel.id,
      channel: channel.name,
      playbackMode: "linearDirect",
      programCount: timeline.programs.length,
      blockCount: timeline.blocks.length,
      cycleDurationSeconds: Number(timeline.total.toFixed(3)),
      commercialEveryMinutes: channel.commercial.intervalSeconds > 0
        ? channel.commercial.intervalSeconds / 60
        : 0,
      commercialDurationSeconds: channel.commercial.durationSeconds,
      commercialPlaybackFormat: channel.commercial.streamFormat,
      playbackQueueHorizonHours: channel.queueHorizonSeconds / 3600,
      programs: timeline.programs.map((program, index) => ({
        id: program.id,
        title: program.title,
        streamFormat: program.streamFormat,
        durationSeconds: Number(program.durationSeconds.toFixed(3)),
        commercialCount: timeline.programWindows[index].commercialCount,
      })),
    }, 200, headOnly);
  }

  if (subpath === "/commercial.m3u8") {
    const playlist = commercialPlaylist(channel);
    if (!playlist) return jsonResponse({ success: false, error: "Este canal no tiene commercial.m3u8 legacy." }, 404, headOnly);
    return textResponse(playlist, 200, headOnly, "application/vnd.apple.mpegurl; charset=utf-8");
  }

  if (subpath === "/live.m3u8") {
    return jsonResponse({
      success: false,
      migrated: true,
      playbackMode: "linearDirect",
      message: "Este canal se resuelve mediante status/queue, no como HLS lineal.",
      statusUrl: baseUrl + "/channel/" + channel.key + "/status",
      queueStatusUrl: baseUrl + "/channel/" + channel.key + "/status?queue=1",
    }, 410, headOnly);
  }

  return jsonResponse({ success: false, error: "Ruta de canal no encontrada." }, 404, headOnly);
}

// ============================================================
// WORKER
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
      return textResponse("Método no permitido", 405, headOnly);
    }

    try {
      const config = await loadConfig(env);
      const baseUrl = publicBaseUrl(request, env);

      if (path === "/") {
        return jsonResponse({
          service: "fenix-tv-multichannel-linear-direct",
          version: WORKER_VERSION,
          configRevision: config.revision,
          configSource: config.source,
          remoteConfigActive: config.remote,
          configWarning: config.warning,
          channels: config.channels.map((channel) => ({
            key: channel.key,
            id: channel.id,
            name: channel.name,
            status: baseUrl + "/channel/" + channel.key + "/status",
            guide: baseUrl + "/channel/" + channel.key + "/guide.json",
          })),
          catalog: baseUrl + "/catalog.json",
          serviceHealth: baseUrl + "/service-health",
        }, 200, headOnly);
      }

      if (path === "/catalog.json") {
        return jsonResponse(await buildMergedCatalog(request, env, config), 200, headOnly);
      }

      if (path === "/managed-channels.json") {
        const nowSeconds = Date.now() / 1000;
        const items = [];
        for (const channel of config.channels) {
          const timeline = await getTimeline(config, channel);
          const state = livePosition(channel, timeline, nowSeconds);
          const status = buildStatus(config, channel, timeline, state, nowSeconds, baseUrl);
          items.push(buildChannelJson(channel, baseUrl, status));
        }
        return jsonResponse({ linearChannels: items }, 200, headOnly);
      }

      if (path === "/config-status") {
        return jsonResponse({
          success: true,
          version: WORKER_VERSION,
          configRevision: config.revision,
          configVersion: config.configVersion,
          configUpdatedAt: config.updatedAt,
          configSource: config.source,
          remoteConfigActive: config.remote,
          warning: config.warning,
          cacheTtlSeconds: CONFIG_TTL_MS / 1000,
          channelCount: config.channels.length,
          channelKeys: config.channels.map((channel) => channel.key),
        }, 200, headOnly);
      }

      if (path === "/service-health") {
        const results = [];
        for (const channel of config.channels) {
          try {
            const timeline = await getTimeline(config, channel);
            results.push({
              key: channel.key,
              id: channel.id,
              success: true,
              programs: timeline.programs.length,
              blocks: timeline.blocks.length,
              cycleDurationSeconds: Number(timeline.total.toFixed(3)),
            });
          } catch (error) {
            results.push({ key: channel.key, id: channel.id, success: false, error: errorText(error) });
          }
        }
        return jsonResponse({
          success: results.every((item) => item.success),
          version: WORKER_VERSION,
          configRevision: config.revision,
          configSource: config.source,
          channels: results,
        }, 200, headOnly);
      }

      const routed = parseChannelRoute(path);
      if (routed) {
        const channel = findChannel(config, routed.key);
        if (!channel) return jsonResponse({ success: false, error: "Canal no encontrado: " + routed.key }, 404, headOnly);
        return channelResponse(request, env, config, channel, routed.subpath, headOnly);
      }

      // --------------------------------------------------------
      // COMPATIBILIDAD TOTAL CON EL WORKER v2.8 DE HBO FAMILY
      // Esto permite subir v3.0 sin romper BUILD426 ni el catálogo actual.
      // --------------------------------------------------------
      const legacyChannel = findChannel(config, DEFAULT_CHANNEL_KEY) || config.channels[0];
      if (["/status", "/play-state.json", "/channel.json", "/guide.json", "/epg.json", "/health", "/commercial.m3u8", "/live.m3u8"].includes(path)) {
        return channelResponse(request, env, config, legacyChannel, path, headOnly);
      }

      return jsonResponse({ success: false, error: "Ruta no encontrada." }, 404, headOnly);
    } catch (error) {
      console.error("Fénix Multichannel Worker error", error);
      return jsonResponse({ success: false, error: "Error: " + errorText(error) }, 502, headOnly);
    }
  },
};

export const __test = {
  normalizeConfig,
  buildTimeline,
  livePosition,
  buildStatus,
  buildPlaybackQueue,
  guideEvents,
};
