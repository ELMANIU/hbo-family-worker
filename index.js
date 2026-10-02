// ============================================================
// HBO FAMILY HD - FENIX TV
// Cloudflare Worker (index.js)
//
// Genera un canal HLS lineal 24/7 con:
//   - Shrek
//   - Shrek 2
//   - Las Chicas Superpoderosas S01E01-S01E03
//   - comercial directo .ts cada 15 min de contenido
//   - /live.m3u8
//   - /status (now/next + datos para overlays)
//   - /guide.json (EPG)
//   - /channel.json (JSON del canal para Fenix TV)
//   - /catalog.json (wrapper linearChannels para la app)
//
// El comercial se separa con #EXT-X-DISCONTINUITY antes y despues,
// para que el reproductor reinicie timestamps/decoder y no arrastre
// continuidad A/V entre la pelicula y el comercial.
// ============================================================

const WORKER_VERSION = "2.3.0-hbofamily";

const CHANNEL_KEY = "hbofamily";
const CHANNEL_ID = "hbo-family-hd";

const CHANNEL_LOGO =
  "https://dl.dropbox.com/scl/fi/lc6b4gg1twqumr4vrakqj/file_00000000ea5081f5ae4dbb5801f12815.png?rlkey=m6w76492cyq0z12lx91mgo31b&st=kq7ilsda&dl=0";

const CHANNEL_BUG =
  "https://dl.dropbox.com/scl/fi/wfvxs2ld2nkrw2p5mvxr4/file_00000000875881f5b8eb4726d70d23c3.png?rlkey=hdpi75re6qn1ehrhq446ps2zr&st=r6ak8axz&dl=0";

const SHREK_1 =
  "https://hugh.cdn.rumble.cloud/video/fwe2/40/s8/2/e/s/0/2/es02A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=2775631360-2775686435";

const SHREK_2 =
  "https://hugh.cdn.rumble.cloud/video/fwe2/50/s8/2/q/6/9/2/q692A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=2841432064-2841488530";

const CHICAS_SUPERPODEROSAS_S01E01 =
  "https://hugh.cdn.rumble.cloud/video/fww1/3d/s8/2/G/b/-/2/Gb-2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=701018624-701032345";

const CHICAS_SUPERPODEROSAS_S01E02 =
  "https://hugh.cdn.rumble.cloud/video/fwe2/e3/s8/2/A/d/-/2/Ad-2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=700087296-700101020";

const CHICAS_SUPERPODEROSAS_S01E03 =
  "https://hugh.cdn.rumble.cloud/video/fww1/88/s8/2/0/f/-/2/0f-2A.haa.tar?r_file=chunklist.m3u8&r_type=application%2Fvnd.apple.mpegurl&r_range=695165952-695179564";

const COMMERCIAL_TS =
  "https://hugh.cdn.rumble.cloud/video/fwe2/a0/s8/2/Y/B/T/2/YBT2A.aaa.ts";

// ============================================================
// CONFIGURACION DEL CANAL
// ============================================================

const CHANNEL = {
  id: CHANNEL_ID,
  key: CHANNEL_KEY,
  nombre: "HBO FAMILY HD",
  descripcion: "Peliculas familiares en señal lineal 24/7.",

  // Punto fijo para que todos los dispositivos vean el mismo momento.
  epoch: Date.UTC(2026, 9, 2, 0, 0, 0) / 1000,

  intervaloComercialesMinutos: 15,
  comercialEntreProgramas: false,
  protegerInicioProgramaSegundos: 60,
  protegerFinalProgramaSegundos: 60,

  logo: CHANNEL_LOGO,
  channelBugUrl: CHANNEL_BUG,
  channelBugOpacity: 0.78,
  videoAspectRatio: "16:9",
  programOverlay: true,

  programas: [
    {
      id: "shrek-1",
      nombre: "Shrek",
      descripcion: "Shrek.",
      tipo: "pelicula",
      url: SHREK_1,
    },
    {
      id: "shrek-2",
      nombre: "Shrek 2",
      descripcion: "Shrek 2.",
      tipo: "pelicula",
      url: SHREK_2,
    },
    {
      id: "chicas-superpoderosas-s01e01",
      nombre: "Las Chicas Superpoderosas — S01E01",
      descripcion: "Temporada 1 · Episodio 1",
      tipo: "serie",
      url: CHICAS_SUPERPODEROSAS_S01E01,
    },
    {
      id: "chicas-superpoderosas-s01e02",
      nombre: "Las Chicas Superpoderosas — S01E02",
      descripcion: "Temporada 1 · Episodio 2",
      tipo: "serie",
      url: CHICAS_SUPERPODEROSAS_S01E02,
    },
    {
      id: "chicas-superpoderosas-s01e03",
      nombre: "Las Chicas Superpoderosas — S01E03",
      descripcion: "Temporada 1 · Episodio 3",
      tipo: "serie",
      url: CHICAS_SUPERPODEROSAS_S01E03,
    },
  ],

  comerciales: [
    {
      id: "fenix-commercial-01",
      nombre: "Corte comercial",
      descripcion: "Corte comercial Fenix TV.",
      tipo: "comercial",
      url: COMMERCIAL_TS,
      sourceType: "ts",

      // Duracion exacta del comercial: 1 minuto 30 segundos.
      // No hace falta sondear PCR porque ya conocemos la duracion.
      probeDuration: false,
      durationSeconds: 90,
      fallbackDurationSeconds: 90,
    },
  ],
};

// ============================================================
// CONFIGURACION DEL MOTOR
// ============================================================

const SCHEDULE_TTL_MS = 5 * 60 * 1000;
const SOURCE_CACHE_TTL_SECONDS = 60 * 60;

const SEGMENTOS_ATRAS = 15;
const SEGMENTOS_ADELANTE = 12;

// Ventanas protegidas del contenido: nunca se inserta publicidad durante
// el primer minuto ni durante el ultimo minuto del programa.
const PROTECTED_PROGRAM_START_SECONDS = 60;
const PROTECTED_PROGRAM_END_SECONDS = 60;

// Conserva ademas un margen de seguridad de 90 s al final.
const MINIMO_DESPUES_DE_CORTE_SECONDS = 90;

const GUIDE_PAST_DAYS = 1;
const GUIDE_FUTURE_DAYS = 7;
const MAX_GUIDE_EVENTS = 5000;

const TS_PROBE_BYTES = 1024 * 1024;
const TS_PCR_WRAP_SECONDS = Math.pow(2, 33) / 90000;

let scheduleCache = null;
let scheduleCacheTime = 0;
let schedulePromise = null;
const tsDurationCache = new Map();

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
    // Usa automaticamente el dominio actual del Worker.
  }
  return new URL(request.url).origin;
}

function resolveUri(uri, baseUrl) {
  try {
    const resolved = new URL(String(uri).trim(), baseUrl);
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") {
      throw new Error("protocolo no permitido");
    }
    return resolved.href;
  } catch {
    throw new Error("URI invalida en el M3U8: " + uri);
  }
}

function makeTagAbsolute(tag, baseUrl) {
  return tag.replace(/URI\s*=\s*(?:"([^"]+)"|([^,\s]+))/i, function (_whole, quoted, plain) {
    return "URI=\"" + resolveUri(quoted || plain, baseUrl) + "\"";
  });
}

function parseBandwidth(tag) {
  const match = tag.match(/\bBANDWIDTH\s*=\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function findBestVariant(text, baseUrl) {
  const lines = text.split(/\r?\n/);
  const variants = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line.toUpperCase().startsWith("#EXT-X-STREAM-INF:")) continue;

    let uri = "";
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const next = lines[cursor].trim();
      if (!next) continue;
      if (!next.startsWith("#")) uri = resolveUri(next, baseUrl);
      break;
    }

    if (uri) variants.push({ uri, bandwidth: parseBandwidth(line) });
  }

  if (!variants.length) {
    throw new Error("La playlist maestra no contiene variantes de video");
  }

  variants.sort(function (left, right) {
    return left.bandwidth - right.bandwidth;
  });

  return variants[variants.length - 1].uri;
}

// ============================================================
// CARGA HLS VOD
// ============================================================

async function fetchPlaylist(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, text/plain, */*",
      "User-Agent": "Fenix-HBO-Family/" + WORKER_VERSION,
    },
    cf: {
      cacheTtl: SOURCE_CACHE_TTL_SECONDS,
      cacheEverything: true,
    },
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status + " al cargar " + url);
  }

  const text = await response.text();
  if (!text.includes("#EXTM3U")) {
    throw new Error("La fuente no devolvio una playlist HLS: " + url);
  }

  return {
    text,
    finalUrl: response.url || url,
  };
}

// ============================================================
// MEDICION DE DURACION DE TS DIRECTO
// ============================================================

async function remoteFileSize(url) {
  try {
    const head = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Fenix-HBO-Family/" + WORKER_VERSION },
    });

    if (head.ok) {
      const length = Number(head.headers.get("content-length") || 0);
      if (Number.isFinite(length) && length > 0) return length;
    }
  } catch {
    // Se intenta con Range debajo.
  }

  const ranged = await fetch(url, {
    headers: {
      Range: "bytes=0-0",
      "User-Agent": "Fenix-HBO-Family/" + WORKER_VERSION,
    },
  });

  if (!ranged.ok) throw new Error("No se pudo consultar el tamaño del TS");

  const contentRange = String(ranged.headers.get("content-range") || "");
  const match = contentRange.match(/\/(\d+)$/);
  if (match) return Number(match[1]);

  const length = Number(ranged.headers.get("content-length") || 0);
  if (ranged.status === 200 && Number.isFinite(length) && length > 0) return length;

  throw new Error("El CDN no informo el tamaño del TS");
}

async function fetchByteRange(url, start, end) {
  const response = await fetch(url, {
    headers: {
      Range: "bytes=" + start + "-" + end,
      "User-Agent": "Fenix-HBO-Family/" + WORKER_VERSION,
    },
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status + " leyendo rango del TS");
  }

  // Evita descargar accidentalmente un archivo enorme si el origen ignora Range.
  const reportedLength = Number(response.headers.get("content-length") || 0);
  const requestedLength = end - start + 1;
  if (response.status === 200 && reportedLength > requestedLength * 2) {
    throw new Error("El origen ignoro Range para el TS");
  }

  return new Uint8Array(await response.arrayBuffer());
}

function pcrSecondsAt(bytes, offset) {
  // Cabecera TS: sync(0), flags/PID(1-2), AFC/CC(3).
  const adaptationFieldControl = (bytes[offset + 3] >> 4) & 0x03;
  if (adaptationFieldControl !== 2 && adaptationFieldControl !== 3) return null;

  const adaptationLength = bytes[offset + 4];
  if (adaptationLength < 7) return null;

  const flags = bytes[offset + 5];
  if ((flags & 0x10) === 0) return null;

  const p = offset + 6;
  if (p + 5 >= bytes.length) return null;

  const base =
    bytes[p] * Math.pow(2, 25) +
    bytes[p + 1] * Math.pow(2, 17) +
    bytes[p + 2] * Math.pow(2, 9) +
    bytes[p + 3] * 2 +
    (bytes[p + 4] >> 7);

  const extension = ((bytes[p + 4] & 0x01) << 8) | bytes[p + 5];
  return base / 90000 + extension / 27000000;
}

function scanPcrValues(bytes) {
  const values = [];

  // Busca una alineacion razonable de paquetes de 188 bytes.
  let firstSync = -1;
  for (let offset = 0; offset < Math.min(188, bytes.length); offset += 1) {
    if (bytes[offset] !== 0x47) continue;
    if (offset + 188 < bytes.length && bytes[offset + 188] !== 0x47) continue;
    firstSync = offset;
    break;
  }

  if (firstSync < 0) return values;

  for (let offset = firstSync; offset + 188 <= bytes.length; offset += 188) {
    if (bytes[offset] !== 0x47) continue;
    const value = pcrSecondsAt(bytes, offset);
    if (value !== null && Number.isFinite(value)) values.push(value);
  }

  return values;
}

async function probeTsDuration(url) {
  if (tsDurationCache.has(url)) return tsDurationCache.get(url);

  const promise = (async function () {
    const size = await remoteFileSize(url);
    if (!Number.isFinite(size) || size <= 188) {
      throw new Error("Tamaño invalido del TS");
    }

    const probe = Math.min(TS_PROBE_BYTES, size);
    const firstBytes = await fetchByteRange(url, 0, probe - 1);
    const lastStart = Math.max(0, size - probe);
    const lastBytes = lastStart === 0 ? firstBytes : await fetchByteRange(url, lastStart, size - 1);

    const firstPcrs = scanPcrValues(firstBytes);
    const lastPcrs = scanPcrValues(lastBytes);

    if (!firstPcrs.length || !lastPcrs.length) {
      throw new Error("No se encontraron PCR suficientes en el TS");
    }

    const first = firstPcrs[0];
    const last = lastPcrs[lastPcrs.length - 1];
    let duration = last - first;

    if (duration < 0) duration += TS_PCR_WRAP_SECONDS;

    // Un comercial individual razonable: entre 0.5 s y 30 min.
    if (!Number.isFinite(duration) || duration < 0.5 || duration > 1800) {
      throw new Error("Duracion PCR no razonable: " + duration);
    }

    return Number(duration.toFixed(3));
  })();

  tsDurationCache.set(url, promise);

  try {
    return await promise;
  } catch (error) {
    tsDurationCache.delete(url);
    throw error;
  }
}

async function loadDirectTs(item, sourceIndex) {
  let duration = 0;

  if (item.probeDuration !== false) {
    try {
      duration = await probeTsDuration(item.url);
    } catch (error) {
      console.warn("No se pudo medir automaticamente el comercial TS:", errorText(error));
    }
  }

  if (!(duration > 0)) {
    duration = Number(item.durationSeconds || item.fallbackDurationSeconds || 0);
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(
      "No se pudo determinar la duracion del TS directo. Define fallbackDurationSeconds.",
    );
  }

  return [
    {
      duration,
      uri: item.url,
      mapTag: null,
      keyTag: null,
      byteRange: null,
      sourceDiscontinuity: false,
      sourceIndex,
      localIndex: 0,
    },
  ];
}

async function loadSource(item, sourceIndex, depth) {
  const currentDepth = depth || 0;
  if (currentDepth > 3) {
    throw new Error("Demasiadas playlists maestras encadenadas en " + item.nombre);
  }

  if (String(item.sourceType || "").toLowerCase() === "ts" || /\.ts(?:$|\?)/i.test(item.url)) {
    return loadDirectTs(item, sourceIndex);
  }

  const loaded = await fetchPlaylist(item.url);
  const baseUrl = new URL(loaded.finalUrl);

  if (/#EXT-X-STREAM-INF:/i.test(loaded.text)) {
    const variantUrl = findBestVariant(loaded.text, baseUrl);
    return loadSource({ ...item, url: variantUrl }, sourceIndex, currentDepth + 1);
  }

  const lines = loaded.text.split(/\r?\n/);
  const segments = [];

  let pendingDuration = null;
  let pendingByteRange = null;
  let pendingDiscontinuity = false;
  let currentMapTag = null;
  let currentKeyTag = null;
  let localIndex = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const upper = line.toUpperCase();

    if (upper.startsWith("#EXT-X-MAP:")) {
      currentMapTag = makeTagAbsolute(line, baseUrl);
      continue;
    }

    if (upper.startsWith("#EXT-X-KEY:")) {
      currentKeyTag = makeTagAbsolute(line, baseUrl);
      continue;
    }

    if (upper.startsWith("#EXT-X-BYTERANGE:")) {
      pendingByteRange = line;
      continue;
    }

    if (upper === "#EXT-X-DISCONTINUITY") {
      pendingDiscontinuity = true;
      continue;
    }

    if (upper.startsWith("#EXTINF:")) {
      const match = line.match(/^#EXTINF:\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (!match) throw new Error("EXTINF invalido en " + item.nombre + ": " + line);

      pendingDuration = Number(match[1]);
      if (!Number.isFinite(pendingDuration) || pendingDuration <= 0) {
        throw new Error("Duracion invalida en " + item.nombre + ": " + line);
      }
      continue;
    }

    if (!line.startsWith("#") && pendingDuration !== null) {
      segments.push({
        duration: pendingDuration,
        uri: resolveUri(line, baseUrl),
        mapTag: currentMapTag,
        keyTag: currentKeyTag,
        byteRange: pendingByteRange,
        sourceDiscontinuity: pendingDiscontinuity,
        sourceIndex,
        localIndex,
      });

      localIndex += 1;
      pendingDuration = null;
      pendingByteRange = null;
      pendingDiscontinuity = false;
    }
  }

  if (!segments.length) {
    throw new Error("No se encontraron segmentos en " + item.nombre);
  }

  return segments;
}

// ============================================================
// CONSTRUCCION DE LA LINEA DE TIEMPO
// ============================================================

function sumDurations(segments, startIndex, endIndexExclusive) {
  let total = 0;
  for (let index = startIndex; index < endIndexExclusive; index += 1) {
    total += segments[index].duration;
  }
  return total;
}

function appendBlock(
  timeline,
  sourceSegments,
  startIndex,
  endIndexExclusive,
  item,
  type,
  contentIndex,
) {
  if (startIndex >= endIndexExclusive) return;

  const blockIndex = timeline.blocks.length;
  const blockStart = timeline.total;

  for (let index = startIndex; index < endIndexExclusive; index += 1) {
    const sourceSegment = sourceSegments[index];
    const start = timeline.total;

    timeline.segments.push({
      ...sourceSegment,
      start,
      end: start + sourceSegment.duration,
      blockIndex,
      contentIndex: contentIndex === undefined ? null : contentIndex,
    });

    timeline.total += sourceSegment.duration;
    timeline.targetDuration = Math.max(
      timeline.targetDuration,
      Math.ceil(sourceSegment.duration),
    );
  }

  timeline.blocks.push({
    index: blockIndex,
    title: item.nombre,
    description:
      item.descripcion ||
      (type === "comercial" ? "Corte comercial Fenix TV." : "Programacion HBO FAMILY HD."),
    type,
    isCommercial: type === "comercial",
    start: blockStart,
    end: timeline.total,
    duration: timeline.total - blockStart,
    contentIndex: contentIndex === undefined ? null : contentIndex,
  });
}

function appendCommercial(
  timeline,
  commercials,
  commercialLists,
  commercialState,
  contentIndex,
) {
  if (!commercials.length) return;

  const index = commercialState.value % commercials.length;
  commercialState.value += 1;

  appendBlock(
    timeline,
    commercialLists[index],
    0,
    commercialLists[index].length,
    commercials[index],
    "comercial",
    contentIndex,
  );
}

async function buildSchedule() {
  if (!Array.isArray(CHANNEL.programas) || !CHANNEL.programas.length) {
    throw new Error("HBO FAMILY HD no tiene programas");
  }

  const commercials = Array.isArray(CHANNEL.comerciales) ? CHANNEL.comerciales : [];

  const programLists = await Promise.all(
    CHANNEL.programas.map(function (item, index) {
      return loadSource(item, index, 0);
    }),
  );

  const commercialLists = await Promise.all(
    commercials.map(function (item, index) {
      return loadSource(item, CHANNEL.programas.length + index, 0);
    }),
  );

  const timeline = {
    segments: [],
    blocks: [],
    contents: [],
    total: 0,
    targetDuration: 1,
  };

  const commercialState = { value: 0 };
  const intervalSeconds = Math.max(
    0,
    Number(CHANNEL.intervaloComercialesMinutos || 0) * 60,
  );

  for (let programIndex = 0; programIndex < CHANNEL.programas.length; programIndex += 1) {
    const item = CHANNEL.programas[programIndex];
    const sourceSegments = programLists[programIndex];
    const contentIndex = timeline.contents.length;

    const contentStart = timeline.total;
    const pureMediaDuration = sumDurations(sourceSegments, 0, sourceSegments.length);

    let partStart = 0;
    let sinceCommercial = 0;
    let mediaElapsed = 0;

    for (let index = 0; index < sourceSegments.length; index += 1) {
      const segmentDuration = sourceSegments[index].duration;
      sinceCommercial += segmentDuration;
      mediaElapsed += segmentDuration;

      if (!intervalSeconds || !commercials.length || sinceCommercial < intervalSeconds) {
        continue;
      }

      const remaining = sumDurations(sourceSegments, index + 1, sourceSegments.length);

      // Nunca interrumpir los 60 s de ESTAS VIENDO al inicio.
      const protectedStart = Math.max(
        PROTECTED_PROGRAM_START_SECONDS,
        Number(CHANNEL.protegerInicioProgramaSegundos || 0),
      );
      if (mediaElapsed <= protectedStart) continue;

      // Nunca meter publicidad en los 60 s reservados para A CONTINUACION.
      // El margen de 90 s existente sigue siendo mas conservador.
      const protectedEnd = Math.max(
        PROTECTED_PROGRAM_END_SECONDS,
        Number(CHANNEL.protegerFinalProgramaSegundos || 0),
      );
      if (remaining <= protectedEnd) continue;
      if (remaining < MINIMO_DESPUES_DE_CORTE_SECONDS) continue;

      appendBlock(
        timeline,
        sourceSegments,
        partStart,
        index + 1,
        item,
        item.tipo || "programa",
        contentIndex,
      );

      appendCommercial(
        timeline,
        commercials,
        commercialLists,
        commercialState,
        contentIndex,
      );

      partStart = index + 1;
      sinceCommercial = 0;
    }

    appendBlock(
      timeline,
      sourceSegments,
      partStart,
      sourceSegments.length,
      item,
      item.tipo || "programa",
      contentIndex,
    );

    const contentEnd = timeline.total;

    timeline.contents.push({
      index: contentIndex,
      id: item.id || "program-" + contentIndex,
      title: item.nombre,
      description: item.descripcion || "Programacion HBO FAMILY HD.",
      type: item.tipo || "programa",
      start: contentStart,
      end: contentEnd,
      linearDuration: contentEnd - contentStart,
      mediaDuration: pureMediaDuration,
    });

    if (CHANNEL.comercialEntreProgramas && commercials.length) {
      appendCommercial(
        timeline,
        commercials,
        commercialLists,
        commercialState,
        null,
      );
    }
  }

  if (!timeline.segments.length || !Number.isFinite(timeline.total) || timeline.total <= 0) {
    throw new Error("El calendario de HBO FAMILY HD no tiene una duracion valida");
  }

  const discontinuitiesBefore = new Array(timeline.segments.length + 1).fill(0);

  for (let index = 0; index < timeline.segments.length; index += 1) {
    const previous = index > 0 ? timeline.segments[index - 1] : null;
    const current = timeline.segments[index];
    const blockChanged = Boolean(previous && previous.blockIndex !== current.blockIndex);

    discontinuitiesBefore[index + 1] =
      discontinuitiesBefore[index] +
      (blockChanged || current.sourceDiscontinuity ? 1 : 0);
  }

  return {
    channelKey: CHANNEL_KEY,
    channelName: CHANNEL.nombre,
    channelDescription: CHANNEL.descripcion,
    epoch: CHANNEL.epoch,
    segments: timeline.segments,
    blocks: timeline.blocks,
    contents: timeline.contents,
    total: timeline.total,
    targetDuration: timeline.targetDuration,
    playlistVersion: timeline.segments.some(function (segment) {
      return Boolean(segment.mapTag);
    })
      ? 7
      : timeline.segments.some(function (segment) {
          return Boolean(segment.byteRange);
        })
        ? 4
        : 3,
    discontinuitiesBefore,
    cycleDiscontinuities: discontinuitiesBefore[timeline.segments.length] + 1,
  };
}

async function getSchedule() {
  const now = Date.now();

  if (scheduleCache && now - scheduleCacheTime < SCHEDULE_TTL_MS) {
    return scheduleCache;
  }

  if (!schedulePromise) {
    schedulePromise = buildSchedule()
      .then(function (schedule) {
        scheduleCache = schedule;
        scheduleCacheTime = Date.now();
        return schedule;
      })
      .catch(function (error) {
        if (scheduleCache) {
          console.error(
            "No se pudo actualizar el calendario; se conserva el anterior",
            error,
          );
          return scheduleCache;
        }
        throw error;
      })
      .finally(function () {
        schedulePromise = null;
      });
  }

  return schedulePromise;
}

// ============================================================
// ESTADO LINEAL
// ============================================================

function getLiveState(schedule, nowSeconds) {
  const elapsed = Math.max(0, nowSeconds - schedule.epoch);

  let cycle = Math.floor(elapsed / schedule.total);
  let position = elapsed - cycle * schedule.total;

  if (position >= schedule.total - 0.001) {
    cycle += 1;
    position = 0;
  }

  let low = 0;
  let high = schedule.segments.length - 1;
  let index = high;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const segment = schedule.segments[middle];

    if (position < segment.start) {
      high = middle - 1;
    } else if (position >= segment.end) {
      low = middle + 1;
    } else {
      index = middle;
      break;
    }
  }

  return {
    cycle,
    position,
    index,
    absolute: cycle * schedule.segments.length + index,
  };
}

function segmentForAbsolute(schedule, absolute) {
  const count = schedule.segments.length;
  const index = ((absolute % count) + count) % count;
  return schedule.segments[index];
}

function hasDiscontinuityBefore(schedule, absolute) {
  if (absolute <= 0) return false;

  const count = schedule.segments.length;
  const index = ((absolute % count) + count) % count;

  if (index === 0) return true;

  const previous = schedule.segments[index - 1];
  const current = schedule.segments[index];

  return (
    previous.blockIndex !== current.blockIndex ||
    Boolean(current.sourceDiscontinuity)
  );
}

function discontinuitySequenceBefore(schedule, absolute) {
  if (absolute <= 0) return 0;

  const count = schedule.segments.length;
  const cycle = Math.floor(absolute / count);
  const index = absolute - cycle * count;

  return (
    cycle * schedule.cycleDiscontinuities +
    schedule.discontinuitiesBefore[index]
  );
}

function programDateTimeFor(schedule, absolute, segment) {
  const cycle = Math.floor(absolute / schedule.segments.length);
  return schedule.epoch + cycle * schedule.total + segment.start;
}

// ============================================================
// PLAYLIST LIVE
// ============================================================

function buildLivePlaylist(schedule, state) {
  const first = Math.max(0, state.absolute - SEGMENTOS_ATRAS);
  const last = state.absolute + SEGMENTOS_ADELANTE;

  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:" + schedule.playlistVersion,
    "#EXT-X-TARGETDURATION:" + schedule.targetDuration,
    "#EXT-X-MEDIA-SEQUENCE:" + first,
    "#EXT-X-DISCONTINUITY-SEQUENCE:" +
      discontinuitySequenceBefore(schedule, first),
  ];

  let previousMapTag = null;
  let previousKeyTag = "__unset__";

  for (let absolute = first; absolute <= last; absolute += 1) {
    const segment = segmentForAbsolute(schedule, absolute);

    if (hasDiscontinuityBefore(schedule, absolute)) {
      lines.push("#EXT-X-DISCONTINUITY");
      previousMapTag = null;
      previousKeyTag = "__unset__";
    }

    if (segment.mapTag && segment.mapTag !== previousMapTag) {
      lines.push(segment.mapTag);
      previousMapTag = segment.mapTag;
    }

    if (segment.keyTag !== previousKeyTag) {
      lines.push(segment.keyTag || "#EXT-X-KEY:METHOD=NONE");
      previousKeyTag = segment.keyTag;
    }

    const programDateTime = programDateTimeFor(schedule, absolute, segment);
    lines.push(
      "#EXT-X-PROGRAM-DATE-TIME:" +
        new Date(programDateTime * 1000).toISOString(),
    );

    if (segment.byteRange) lines.push(segment.byteRange);

    lines.push("#EXTINF:" + segment.duration.toFixed(6) + ",");
    lines.push(segment.uri);
  }

  return lines.join("\n") + "\n";
}

// ============================================================
// NOW / NEXT / OVERLAYS
// ============================================================

function blockOccurrence(schedule, cycle, blockIndex) {
  const block = schedule.blocks[blockIndex];
  const startSeconds = schedule.epoch + cycle * schedule.total + block.start;
  const endSeconds = schedule.epoch + cycle * schedule.total + block.end;

  return {
    title: block.title,
    description: block.description,
    type: block.type,
    isCommercial: block.isCommercial,
    start: new Date(startSeconds * 1000).toISOString(),
    end: new Date(endSeconds * 1000).toISOString(),
    startSeconds,
    endSeconds,
    durationSeconds: Number(block.duration.toFixed(3)),
  };
}

function contentOccurrence(schedule, cycle, contentIndex) {
  const content = schedule.contents[contentIndex];
  const startSeconds = schedule.epoch + cycle * schedule.total + content.start;
  const endSeconds = schedule.epoch + cycle * schedule.total + content.end;

  return {
    id: content.id,
    title: content.title,
    description: content.description,
    type: content.type,
    start: new Date(startSeconds * 1000).toISOString(),
    end: new Date(endSeconds * 1000).toISOString(),
    startSeconds,
    endSeconds,
    durationSeconds: Number(content.linearDuration.toFixed(3)),
    mediaDurationSeconds: Number(content.mediaDuration.toFixed(3)),
  };
}

function contentNowAndNext(schedule, state, nowSeconds) {
  let currentContentIndex = schedule.segments[state.index].contentIndex;

  if (currentContentIndex === null || currentContentIndex === undefined) {
    // Fallback para un posible comercial entre programas.
    for (let index = 0; index < schedule.contents.length; index += 1) {
      const content = schedule.contents[index];
      if (state.position >= content.start && state.position < content.end) {
        currentContentIndex = index;
        break;
      }
    }
  }

  if (currentContentIndex === null || currentContentIndex === undefined) {
    currentContentIndex = 0;
  }

  const nextContentIndex = (currentContentIndex + 1) % schedule.contents.length;
  const nextCycle = state.cycle + (nextContentIndex === 0 ? 1 : 0);

  const nowContent = contentOccurrence(
    schedule,
    state.cycle,
    currentContentIndex,
  );

  const nextContent = contentOccurrence(
    schedule,
    nextCycle,
    nextContentIndex,
  );

  const elapsed = Math.max(0, nowSeconds - nowContent.startSeconds);
  const remaining = Math.max(0, nowContent.endSeconds - nowSeconds);
  const progress = Math.max(
    0,
    Math.min(1, elapsed / Math.max(0.001, nowContent.durationSeconds)),
  );

  return {
    nowContent,
    nextContent,
    elapsedSeconds: Number(elapsed.toFixed(3)),
    remainingSeconds: Number(remaining.toFixed(3)),
    progressPercent: Number((progress * 100).toFixed(2)),

    // La app puede leer directamente estas banderas.
    overlay: {
      showNow: elapsed >= 0 && elapsed < 60,
      showNext: remaining > 0 && remaining <= 60,
      nowLabel: "ESTÁS VIENDO",
      nextLabel: "A CONTINUACIÓN",
      nowTitle: nowContent.title,
      nextTitle: nextContent.title,
      displaySeconds: 60,
    },
  };
}

function scheduleSummary(schedule, nowSeconds) {
  const state = getLiveState(schedule, nowSeconds);
  const currentBlockIndex = schedule.segments[state.index].blockIndex;
  const actualNow = blockOccurrence(schedule, state.cycle, currentBlockIndex);
  const content = contentNowAndNext(schedule, state, nowSeconds);

  return {
    id: CHANNEL_ID,
    key: CHANNEL_KEY,
    channel: schedule.channelName,
    description: schedule.channelDescription,

    // Bloque real: puede ser pelicula o comercial.
    now: actualNow,

    // Para UI/EPG: siempre pelicula actual y siguiente pelicula.
    nowContent: content.nowContent,
    nextContent: content.nextContent,

    progressPercent: content.progressPercent,
    elapsedSeconds: content.elapsedSeconds,
    remainingSeconds: content.remainingSeconds,
    overlay: content.overlay,
    commercialPolicy: {
      everyMinutes: CHANNEL.intervaloComercialesMinutos,
      durationSeconds: 90,
      protectStartSeconds: CHANNEL.protegerInicioProgramaSegundos,
      protectEndSeconds: CHANNEL.protegerFinalProgramaSegundos,
    },

    cycle: state.cycle,
    positionInCycle: Number(state.position.toFixed(3)),
    cycleDurationSeconds: Number(schedule.total.toFixed(3)),
    mediaSequence: state.absolute,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// EPG DE CONTENIDO (NO MUESTRA COMERCIALES COMO PROGRAMA APARTE)
// ============================================================

function buildGuide(schedule, fromSeconds, untilSeconds) {
  const events = [];

  const firstCycle = Math.max(
    0,
    Math.floor((fromSeconds - schedule.epoch) / schedule.total) - 1,
  );

  const lastCycle = Math.max(
    firstCycle,
    Math.floor((untilSeconds - schedule.epoch) / schedule.total) + 1,
  );

  for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
    for (let contentIndex = 0; contentIndex < schedule.contents.length; contentIndex += 1) {
      const event = contentOccurrence(schedule, cycle, contentIndex);

      if (event.endSeconds <= fromSeconds || event.startSeconds >= untilSeconds) {
        continue;
      }

      events.push({
        id: event.id,
        start: event.start,
        end: event.end,
        title: event.title,
        description: event.description,
        type: event.type,
        durationSeconds: event.durationSeconds,
      });

      if (events.length >= MAX_GUIDE_EVENTS) return events;
    }
  }

  return events;
}

function guideWindow(schedule, nowSeconds) {
  return buildGuide(
    schedule,
    nowSeconds - GUIDE_PAST_DAYS * 86400,
    nowSeconds + GUIDE_FUTURE_DAYS * 86400,
  );
}

// ============================================================
// JSON PARA FENIX TV
// ============================================================

function buildChannelJson(baseUrl, schedule, nowSeconds) {
  const status = scheduleSummary(schedule, nowSeconds);

  return {
    id: CHANNEL_ID,
    contentId: CHANNEL_ID,
    enabled: true,

    Title: CHANNEL.nombre,
    Description: CHANNEL.descripcion,

    CategoryKey: "peliculas",
    CategoryTitle: "Peliculas",

    specialKey: "hbofamily",
    channelMode: "linear",
    playerStyle: "hbofamily",

    Logo: CHANNEL.logo,
    channelBugUrl: CHANNEL.channelBugUrl,
    channelBugOpacity: CHANNEL.channelBugOpacity,
    videoAspectRatio: CHANNEL.videoAspectRatio,
    programOverlay: CHANNEL.programOverlay,

    Url: baseUrl + "/live.m3u8",
    streamFormat: "hls",
    mediaType: "livefeed",
    contentType: "livefeed",
    quality: "Full HD",
    audio: "Español",

    tagline:
      "AHORA: " +
      status.nowContent.title +
      " · DESPUES: " +
      status.nextContent.title,

    statusUrl: baseUrl + "/status",
    guideUrl: baseUrl + "/guide.json",
    epgUrl: baseUrl + "/epg.json",

    // Datos inmediatos para no esperar otra consulta al abrir la app.
    nowContent: status.nowContent,
    nextContent: status.nextContent,
    progressPercent: status.progressPercent,
    overlay: status.overlay,

    commercialPolicy: {
      everyMinutes: CHANNEL.intervaloComercialesMinutos,
      durationSeconds: 90,
      protectStartSeconds: CHANNEL.protegerInicioProgramaSegundos,
      protectEndSeconds: CHANNEL.protegerFinalProgramaSegundos,
    },

    // Alias opcional para la UI que maneje un target now/next.
    target: {
      type: "now-next",
      statusUrl: baseUrl + "/status",
      now: status.nowContent.title,
      next: status.nextContent.title,
    },
  };
}

// ============================================================
// HTTP
// ============================================================

function commonCorsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "*",
    "x-content-type-options": "nosniff",
  };
}

function hlsHeaders() {
  return {
    ...commonCorsHeaders(),
    "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    "cdn-cache-control": "no-store",
    pragma: "no-cache",
  };
}

function jsonHeaders() {
  return {
    ...commonCorsHeaders(),
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
  };
}

function jsonResponse(value, status, headOnly) {
  return new Response(headOnly ? null : JSON.stringify(value, null, 2), {
    status: status || 200,
    headers: jsonHeaders(),
  });
}

function textResponse(value, status, headOnly, headers) {
  return new Response(headOnly ? null : value, {
    status: status || 200,
    headers:
      headers || {
        ...commonCorsHeaders(),
        "content-type": "text/plain; charset=utf-8",
      },
  });
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
      return new Response(null, {
        status: 204,
        headers: commonCorsHeaders(),
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return textResponse("Metodo no permitido", 405, headOnly, {
        ...commonCorsHeaders(),
        "content-type": "text/plain; charset=utf-8",
        allow: "GET, HEAD, OPTIONS",
      });
    }

    try {
      const baseUrl = publicBaseUrl(request, env);
      const schedule = await getSchedule();
      const nowSeconds = Date.now() / 1000;
      const state = getLiveState(schedule, nowSeconds);

      if (path === "/") {
        return jsonResponse(
          {
            service: "fenix-hbo-family-hd",
            version: WORKER_VERSION,
            channel: CHANNEL.nombre,
            live: baseUrl + "/live.m3u8",
            status: baseUrl + "/status",
            guide: baseUrl + "/guide.json",
            channelJson: baseUrl + "/channel.json",
            catalog: baseUrl + "/catalog.json",
            health: baseUrl + "/health",
          },
          200,
          headOnly,
        );
      }

      if (
        path === "/live.m3u8" ||
        path === "/hbofamily/live.m3u8" ||
        path === "/hbo-family-hd/live.m3u8"
      ) {
        return textResponse(
          buildLivePlaylist(schedule, state),
          200,
          headOnly,
          hlsHeaders(),
        );
      }

      if (
        path === "/status" ||
        path === "/hbofamily/status" ||
        path === "/hbo-family-hd/status"
      ) {
        return jsonResponse(
          scheduleSummary(schedule, nowSeconds),
          200,
          headOnly,
        );
      }

      if (
        path === "/guide.json" ||
        path === "/epg.json" ||
        path === "/hbofamily/guide.json" ||
        path === "/hbo-family-hd/guide.json"
      ) {
        const status = scheduleSummary(schedule, nowSeconds);

        return jsonResponse(
          {
            id: CHANNEL_ID,
            key: CHANNEL_KEY,
            channel: CHANNEL.nombre,
            liveUrl: baseUrl + "/live.m3u8",
            generatedAt: new Date().toISOString(),
            now: status.nowContent,
            next: status.nextContent,
            progressPercent: status.progressPercent,
            overlay: status.overlay,
            epg: guideWindow(schedule, nowSeconds),
          },
          200,
          headOnly,
        );
      }

      if (path === "/channel.json") {
        return jsonResponse(
          buildChannelJson(baseUrl, schedule, nowSeconds),
          200,
          headOnly,
        );
      }

      if (path === "/catalog.json") {
        const channel = buildChannelJson(baseUrl, schedule, nowSeconds);

        return jsonResponse(
          {
            linearChannels: [channel],
            generatedAt: new Date().toISOString(),
            version: WORKER_VERSION,
          },
          200,
          headOnly,
        );
      }

      if (path === "/catalog-fragment.json") {
        const channel = buildChannelJson(baseUrl, schedule, nowSeconds);

        return jsonResponse(
          {
            tvCategories: [
              {
                Title: "Fenix en vivo",
                Key: "fenix_en_vivo",
                Description: "Canales lineales Fenix TV.",
                enabled: true,
                Channels: [channel],
              },
            ],
          },
          200,
          headOnly,
        );
      }

      if (path === "/health") {
        const commercialDuration = schedule.blocks.find(function (block) {
          return block.isCommercial;
        });

        return jsonResponse(
          {
            success: true,
            version: WORKER_VERSION,
            channel: CHANNEL.nombre,
            segments: schedule.segments.length,
            cycleDurationSeconds: Number(schedule.total.toFixed(3)),
            targetDuration: schedule.targetDuration,
            commercialEveryMinutes: CHANNEL.intervaloComercialesMinutos,
            commercialDetectedDurationSeconds: commercialDuration
              ? Number(commercialDuration.duration.toFixed(3))
              : null,
            updatedAt: new Date().toISOString(),
          },
          200,
          headOnly,
        );
      }

      return jsonResponse(
        {
          success: false,
          error: "Ruta no encontrada.",
          available: [
            "/live.m3u8",
            "/status",
            "/guide.json",
            "/channel.json",
            "/catalog.json",
            "/catalog-fragment.json",
            "/health",
          ],
        },
        404,
        headOnly,
      );
    } catch (error) {
      console.error("Error HBO FAMILY HD", error);

      return jsonResponse(
        {
          success: false,
          error: "Error generando HBO FAMILY HD: " + errorText(error),
        },
        502,
        headOnly,
      );
    }
  },
};

export const __test = {
  buildSchedule,
  buildLivePlaylist,
  getLiveState,
  contentNowAndNext,
  buildGuide,
  probeTsDuration,
};
