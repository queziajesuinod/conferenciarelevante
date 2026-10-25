// ============================================================
// Pré-render para SEO e prévias de link (WhatsApp, Facebook, Google)
//
// As páginas /ministracao e /evento são montadas por JavaScript, e os robôs
// de prévia não executam JS. Este script roda no build do Docker e gera uma
// cópia de cada página com título, descrição e imagem já preenchidos:
//   <out>/prerender/ministracao/<videoId>.html
//   <out>/prerender/evento/<eventId>.html
//   <out>/og/evento-<eventId>.jpg   (imagem do evento, que a API manda em base64)
//   <out>/sitemap.xml
// O nginx entrega essas cópias quando existem (ver nginx/default.conf);
// o JS da página continua buscando os dados ao vivo normalmente.
//
// Uso: node scripts/prerender.mjs [pasta-de-saida]   (padrão: ./dist)
// ============================================================
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'dist'));
const SITE = 'https://juventuderelevante.com.br';
const VIDEOS_API = 'https://portal.iecg.com.br/api/public/videos';
const EVENTS_API = 'https://portal.iecg.com.br/api/public/events';
const CHANNEL = 'UCQgiTCH_nbNmvej0ZA6YE5Q';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const strip = (html) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (t, n) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t);
const fmtDate = (iso, o) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Campo_Grande', ...o });

// mesma limpeza de título usada no site (js/videos.js)
const NOISE = /^((culto\s+)?juventude\s+relevante|\d{1,2}\s*h(\d{2})?|ao\s+vivo.*)$/i;
const SPEAKER = /^(pr|pra|pastor|pastora|ap|bp)\.?\s/i;
function parseTitle(raw) {
  const parts = String(raw || 'Ministração').split(/\s*[|│]\s*|\s+l\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const clean = parts.filter((p) => !SPEAKER.test(p) && !NOISE.test(p));
  if (!clean.length) return { title: raw, series: '' };
  if (clean.length === 1) return { title: clean[0], series: '' };
  return { series: clean[0], title: clean.slice(1).join(' · ') };
}
const seriesKey = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
}

async function fetchVideos() {
  const base = `${VIDEOS_API}?channelId=${CHANNEL}&limit=100`;
  const first = await getJSON(`${base}&offset=0`);
  let items = first.items || [];
  for (let off = items.length, i = 0; first.total && off < first.total && i < 20; i++) {
    const page = (await getJSON(`${base}&offset=${off}`)).items || [];
    if (!page.length) break;
    items = items.concat(page);
    off += page.length;
  }
  return items;
}

// troca/insere as metatags no <head> do template
function withMeta(tpl, m) {
  let html = tpl
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(m.description)}$2`)
    .replace(/(<link rel="canonical"[^>]*href=")[^"]*(")/, `$1${esc(m.url)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(m.ogTitle || m.title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(m.description)}$2`);
  const extra = [
    `<meta property="og:url" content="${esc(m.url)}" />`,
    m.image && `<meta property="og:image" content="${esc(m.image)}" />`,
    m.w && `<meta property="og:image:width" content="${m.w}" />`,
    m.h && `<meta property="og:image:height" content="${m.h}" />`,
    '<meta property="og:locale" content="pt_BR" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(m.ogTitle || m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    m.image && `<meta name="twitter:image" content="${esc(m.image)}" />`,
    m.ld && `<script type="application/ld+json">${JSON.stringify(m.ld).replace(/</g, '\\u003c')}</script>`,
  ].filter(Boolean).join('\n    ');
  return html.replace('</head>', `    ${extra}\n  </head>`);
}

async function main() {
  await mkdir(path.join(OUT, 'prerender', 'ministracao'), { recursive: true });
  await mkdir(path.join(OUT, 'prerender', 'evento'), { recursive: true });
  await mkdir(path.join(OUT, 'og'), { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: `${SITE}/`, freq: 'weekly', pri: '1.0' },
    { loc: `${SITE}/ministracoes`, freq: 'weekly', pri: '0.9' },
    { loc: `${SITE}/aovivo`, freq: 'weekly', pri: '0.8' },
    { loc: `${SITE}/conferencia2026`, freq: 'monthly', pri: '0.6' },
  ];

  /* ---- Ministrações ---- */
  try {
    const tpl = await readFile(path.join(ROOT, 'ministracao.html'), 'utf8');
    const videos = await fetchVideos();
    const series = new Map();
    for (const v of videos) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(v.videoId || '')) continue;
      const t = parseTitle(v.title);
      const seo = v.seo || {};
      const url = `${SITE}/ministracao?v=${v.videoId}`;
      const description = clip(seo.metaDescription || strip(v.summary) || strip(v.description), 200);
      // hqdefault sempre existe (maxresdefault falta em alguns vídeos)
      const image = v.thumbnailUrl || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
      const html = withMeta(tpl, {
        title: `${t.title} · ${v.speaker || 'Juventude Relevante'} · Juventude Relevante`,
        ogTitle: `${t.title} · ${v.speaker || 'Juventude Relevante'}`,
        description, url, image,
        ld: {
          '@context': 'https://schema.org', '@type': 'VideoObject', name: seo.metaTitle || t.title, description,
          thumbnailUrl: [v.thumbnailUrl || image], uploadDate: v.publishedAt,
          duration: v.durationSeconds ? `PT${Math.round(v.durationSeconds)}S` : undefined,
          embedUrl: `https://www.youtube.com/embed/${v.videoId}`, contentUrl: v.youtubeUrl,
          publisher: { '@type': 'Organization', name: 'Juventude Relevante · IECG' },
        },
      });
      await writeFile(path.join(OUT, 'prerender', 'ministracao', `${v.videoId}.html`), html);
      urls.push({ loc: url, last: (v.publishedAt || '').slice(0, 10), freq: 'monthly', pri: '0.7' });
      if (t.series) series.set(seriesKey(t.series), (series.get(seriesKey(t.series)) || 0) + 1);
    }
    for (const [k, n] of series) if (n >= 2) urls.push({ loc: `${SITE}/serie?s=${encodeURIComponent(k)}`, freq: 'weekly', pri: '0.6' });
    console.log(`ministrações: ${videos.length} páginas, ${[...series.values()].filter((n) => n >= 2).length} séries`);
  } catch (err) {
    console.warn('aviso: ministrações não pré-renderizadas →', err.message);
  }

  /* ---- Eventos ---- */
  try {
    const tpl = await readFile(path.join(ROOT, 'evento.html'), 'utf8');
    const data = await getJSON(EVENTS_API);
    const list = (Array.isArray(data) ? data : data.items || []).filter((e) => e.isActive !== false && new Date(e.endDate || e.startDate) >= new Date());
    for (const e of list) {
      if (!/^[A-Za-z0-9-]{1,64}$/.test(e.id || '')) continue;
      const parts = String(e.title || 'Evento').replace(/\s+/g, ' ').split(/\s+-\s+/).filter((p) => !/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\w*\.?\s*\d{4}$/i.test(p));
      const name = parts.join(' · ');
      const when = fmtDate(e.startDate, { day: '2-digit', month: 'long' });
      const place = e.isOnline ? 'Online' : [e.location, e.city].filter(Boolean).join(' · ');
      let image = `${SITE}/assets/galeria/hero-multidao.jpg`;
      const m = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/.exec(e.imageUrl || '');
      if (m) {
        const ext = m[1] === 'png' ? 'png' : m[1] === 'webp' ? 'webp' : 'jpg';
        await writeFile(path.join(OUT, 'og', `evento-${e.id}.${ext}`), Buffer.from(m[2], 'base64'));
        image = `${SITE}/og/evento-${e.id}.${ext}`;
      } else if (/^https?:\/\//.test(e.imageUrl || '')) image = e.imageUrl;
      const url = `${SITE}/evento?id=${e.id}`;
      const html = withMeta(tpl, {
        title: `${name} · ${when} · IECG`,
        ogTitle: name,
        description: clip(`${when}${place ? ' · ' + place : ''}. ${strip(e.description)}`, 200),
        url, image, w: 1280, h: 720,
      });
      await writeFile(path.join(OUT, 'prerender', 'evento', `${e.id}.html`), html);
      urls.push({ loc: url, freq: 'weekly', pri: '0.7' });
    }
    console.log(`eventos: ${list.length} páginas`);
  } catch (err) {
    console.warn('aviso: eventos não pré-renderizados →', err.message);
  }

  /* ---- Sitemap ---- */
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.last || today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`;
  await writeFile(path.join(OUT, 'sitemap.xml'), xml);
  console.log(`sitemap: ${urls.length} URLs → ${OUT}`);
}

main().catch((err) => { console.error(err); process.exitCode = 0; });
