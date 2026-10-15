// Sprite sources. Names (incl. Chinese) come from PokeAPI; sprites from several sources:
//   pmd      – PMD SpriteCollab: pixel sprites with real Idle/Walk/Sleep/Eat/Hurt… animations
//   ani      – Pokémon Showdown animated battle sprites
//   gen5ani  – Pokémon Showdown animated Gen-5 pixel sprites
//   home     – Pokémon HOME renders (high resolution, static)
//   bwani    – PokeAPI Black/White animated sprites
// Everything is downloaded once and cached in the app's data folder.
const fs = require('fs');
const path = require('path');
const { net } = require('electron');

const API = 'https://pokeapi.co/api/v2';
const SD = 'https://play.pokemonshowdown.com/sprites';
const PA = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const PMD = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master';

const SOURCES = ['pmd', 'ani', 'gen5ani', 'home', 'bwani'];

// Version of the PMD download format: 2 = every animation listed in AnimData.xml
const PMD_VERSION = 2;

const notFound = () => Object.assign(new Error('not-found'), { code: 'not-found' });

async function getJson(url) {
  const res = await net.fetch(url);
  if (res.status === 404) throw notFound();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getBuffer(url) {
  const res = await net.fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function firstAvailable(urls) {
  for (const u of urls) {
    let buf = null;
    try { buf = await getBuffer(u); } catch { buf = null; }
    if (buf) return { buf, url: u };
  }
  return null;
}

/** Showdown's sprite id: "Mr. Mime" → "mrmime", "Nidoran♀" → "nidoranf", "Flabébé" → "flabebe". */
function showdownId(name) {
  return name
    .replace(/♀/g, 'f').replace(/♂/g, 'm')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

const dex4 = (dex) => String(dex).padStart(4, '0');

/** Look up a species by English name or Pokédex number → { dex, names: { en, zh } }. */
async function lookupSpecies(query) {
  const q = String(query).trim().toLowerCase().replace(/\s+/g, '-').replace(/^#/, '');
  if (!q) throw notFound();
  const species = await getJson(`${API}/pokemon-species/${encodeURIComponent(q)}`);
  const pick = (lang) => species.names.find((n) => n.language.name === lang)?.name;
  return {
    dex: species.id,
    names: {
      en: pick('en') || species.name,
      zh: pick('zh-hans') || pick('zh-hant') || pick('en') || species.name
    }
  };
}

/** Parse PMD AnimData.xml → { Name: { fw, fh, durs: [ticks], copyOf } } */
function parseAnimData(xml) {
  const anims = {};
  for (const block of xml.match(/<Anim>[\s\S]*?<\/Anim>/g) || []) {
    const get = (tag) => (block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`)) || [])[1];
    const name = get('Name');
    if (!name) continue;
    anims[name] = {
      fw: Number(get('FrameWidth')) || 0,
      fh: Number(get('FrameHeight')) || 0,
      durs: (block.match(/<Duration>(\d+)<\/Duration>/g) || []).map((d) => Number(d.replace(/\D/g, ''))),
      copyOf: get('CopyOf') || null
    };
  }
  return anims;
}

async function downloadPmd(dex, shiny, dir) {
  const base = `${PMD}/sprite/${dex4(dex)}${shiny ? '/0000/0001' : ''}`;
  const xmlBuf = await getBuffer(`${base}/AnimData.xml`);
  if (!xmlBuf) throw notFound();
  const all = parseAnimData(xmlBuf.toString('utf8'));
  const folder = `pmd-${dex4(dex)}${shiny ? '-shiny' : ''}`;
  const out = path.join(dir, folder);
  fs.mkdirSync(out, { recursive: true });

  const anims = {};
  for (const name of Object.keys(all)) {
    let a = all[name];
    const sheetName = a.copyOf || name;
    if (a.copyOf) a = { ...all[a.copyOf], copyOf: a.copyOf };
    if (!a || !a.fw || !a.durs.length) continue;
    const file = `${sheetName}-Anim.png`;
    if (!fs.existsSync(path.join(out, file))) {
      const buf = await getBuffer(`${base}/${file}`);
      if (!buf) continue;
      fs.writeFileSync(path.join(out, file), buf);
    }
    anims[name] = { fw: a.fw, fh: a.fh, durs: a.durs, file };
  }
  if (!anims.Idle && !anims.Walk) throw notFound();
  fs.writeFileSync(path.join(out, 'anims.json'), JSON.stringify(anims));
  return { source: 'pmd', style: 'pmd', dir: folder, v: PMD_VERSION };
}

async function downloadImage(dex, nameEn, source, shiny, dir) {
  const sid = showdownId(nameEn);
  const sh = shiny ? '-shiny' : '';
  const ps = shiny ? 'shiny/' : '';
  const chains = {
    ani: [`${SD}/ani${sh}/${sid}.gif`, `${PA}/other/showdown/${ps}${dex}.gif`],
    gen5ani: [`${SD}/gen5ani${sh}/${sid}.gif`, `${PA}/versions/generation-v/black-white/animated/${ps}${dex}.gif`, `${SD}/gen5${sh}/${sid}.png`],
    home: [`${SD}/home${sh}/${sid}.png`, `${PA}/other/home/${ps}${dex}.png`],
    bwani: [`${PA}/versions/generation-v/black-white/animated/${ps}${dex}.gif`, `${PA}/versions/generation-v/black-white/${ps}${dex}.png`]
  };
  const got = await firstAvailable(chains[source] || chains.ani);
  if (!got) throw notFound();
  const ext = path.extname(got.url);
  // how the pet should render it: detailed renders are scaled smoothly, pixel art crisply
  const style = source === 'home' ? 'hires' : source === 'ani' && ext === '.gif' ? 'ani' : 'pixel';
  fs.mkdirSync(dir, { recursive: true });
  const file = `${dex}-${source}${sh}${ext}`;
  fs.writeFileSync(path.join(dir, file), got.buf);
  return { source, style, file };
}

/** Download a sprite ("skin") for a species from the given source. */
async function downloadSkin(dex, nameEn, source, shiny, dir) {
  if (!SOURCES.includes(source)) source = 'ani';
  const meta = source === 'pmd'
    ? await downloadPmd(dex, shiny, dir)
    : await downloadImage(dex, nameEn, source, shiny, dir);
  return { ...meta, shiny: !!shiny };
}

/** PMD portrait (40x40 face) for the diary, cached. emotion: Normal | Happy | Sad | Pain | Joyous … */
async function portrait(dex, emotion, dir) {
  const folder = path.join(dir, 'portraits');
  const file = path.join(folder, `${dex4(dex)}-${emotion}.png`);
  if (fs.existsSync(file)) return fs.readFileSync(file);
  const buf = await getBuffer(`${PMD}/portrait/${dex4(dex)}/${emotion}.png`)
    || (emotion !== 'Normal' ? await getBuffer(`${PMD}/portrait/${dex4(dex)}/Normal.png`) : null);
  if (!buf) return null;
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(file, buf);   // a missing emotion is stored as its "Normal" face
  return buf;
}

module.exports = { SOURCES, PMD_VERSION, lookupSpecies, downloadSkin, portrait };
