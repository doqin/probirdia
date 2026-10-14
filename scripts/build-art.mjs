// One-off: turns the artist's raw "Slay the demon king" folder into web-ready files.
//
//   node scripts/build-art.mjs "<folder with the PNG/MP3 files>"
//
// - sprites/props: trimmed to their pixels and saved as WebP (public/games/slay-the-demon-king/)
// - stages: the 16:9 backgrounds are composed here from the artist's tiles
// - music: copied as-is
// Needs `sharp` (already installed with Astro). Re-run it whenever the artwork changes.
import sharp from 'sharp';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error('Usage: node scripts/build-art.mjs "<folder with the raw art>"');
  process.exit(1);
}
const out = path.resolve('public', 'games', 'slay-the-demon-king');
mkdirSync(out, { recursive: true });

const W = 1600;
const H = 900;
const webp = { quality: 86, effort: 5 };
const png = (name) => path.join(src, `${name}.png`);

/** Trimmed copy of a raw PNG, as a PNG buffer (optionally scaled to a height). */
async function trimmed(name, height) {
  let img = sharp(png(name)).trim({ threshold: 5 });
  if (height) img = img.resize({ height, kernel: 'nearest', withoutEnlargement: true });
  return img.png().toBuffer();
}

// ---- sprites and props ---------------------------------------------------------------
// [raw file name, output name, max height in px]
const SPRITES = [
  ['hero_idle', 'hero_idle', 640], ['hero_point', 'hero_point', 640], ['hero_hold_', 'hero_hold', 640],
  ['hero_run', 'hero_run', 640], ['hero_back', 'hero_back', 640], ['hero_climbing', 'hero_climbing', 640],
  ['hero_head_tilt', 'hero_head_tilt', 640],
  ['bird_landed', 'bird_landed', 360], ['bird_fly_idle', 'bird_fly_idle', 360], ['bird_fly_up', 'bird_fly_up', 360],
  ['villager_male', 'villager_male', 560], ['villager_female', 'villager_female', 560], ['blacksmith', 'blacksmith', 640],
  ['demon_king_healthy', 'demon_king_healthy', 900], ['demon_king_blushing', 'demon_king_blushing', 900],
  ['demon_king_dead', 'demon_king_dead', 500],
  ['fire_big', 'fire_big', 500], ['fire_small', 'fire_small', 360], ['fire_bright', 'fire_bright', 360],
  ['gate', 'gate', 800], ['gate_magic_barrier', 'gate_magic_barrier', 800],
  ['sign', 'sign', 500], ['torn_note', 'torn_note', 300], ['chest_unopened', 'chest_unopened', 300],
  ['boulder', 'boulder', 700], ['anvil', 'anvil', 200], ['goddess', 'goddess', 308], ['cloud', 'cloud', 200],
  ['wind_effect', 'wind_effect', 300], ['light_chest', 'light_chest', 700], ['light_magic_barrier', 'light_magic_barrier', 800],
  ['rope_bridge', 'rope_bridge', 242], ['speech_bubble_round', 'speech_bubble_round', 254],
  ['speech_bubble_square', 'speech_bubble_square', 400],
  ['villager_house_normal', 'house_normal', 500], ['villager_house_burnt', 'house_burnt', 500],
  ['water_bucket', 'water_bucket', 360], ['water_droplet', 'water_droplet', 360], ['Speed_line', 'speed_line', 400],
  ['relic_1_the_chestplate_of_earth', 'relic_1_breastplate', 360], ['relic_2_the_shield_of_frost', 'relic_2_shield', 360],
  ['relic_3_the_sword_of_flame', 'relic_3_sword', 360], ['relic_4_the_ring_of_light', 'relic_4_ring', 360],
  ['relic_5_boots_of_wind', 'relic_5_boots', 360],
];
for (const [name, outName, height] of SPRITES) {
  await sharp(await trimmed(name, height)).webp(webp).toFile(path.join(out, `${outName}.webp`));
}

// ---- stages (1600x900) ---------------------------------------------------------------
const cover = (name, position = 'centre') =>
  sharp(png(name)).trim({ threshold: 5 }).resize(W, H, { fit: 'cover', position, kernel: 'nearest' }).png().toBuffer();

async function tile(name, size, width, height) {
  const t = await sharp(png(name)).trim({ threshold: 5 }).resize(size, size, { fit: 'fill', kernel: 'nearest' }).png().toBuffer();
  const tiles = [];
  for (let x = 0; x < width; x += size) for (let y = 0; y < height; y += size) tiles.push({ input: t, left: x, top: y });
  return sharp({ create: { width, height, channels: 4, background: '#00000000' } }).composite(tiles).png().toBuffer();
}
const strip = (name, width, height) =>
  sharp(png(name)).trim({ threshold: 5 }).resize(width, height, { fit: 'fill', kernel: 'nearest' }).png().toBuffer();
const saveStage = (name, layers) =>
  sharp({ create: { width: W, height: H, channels: 4, background: '#000000' } })
    .composite(layers)
    .webp({ quality: 82, effort: 5 })
    .toFile(path.join(out, `${name}.webp`));

await saveStage('stage_sky', [{ input: await cover('background_cloudy') }]);

const floorTop = Math.round(H * 0.74);
await saveStage('stage_temple', [
  { input: await tile('stone_wall', 450, W, H), top: 0, left: 0 },
  { input: await strip('ground_stone', W, H - floorTop), top: floorTop, left: 0 },
]);

await saveStage('stage_cave', [{ input: await cover('background_icy_cave', 'south') }]);

const villageFloor = Math.round(H * 0.8);
await saveStage('stage_village', [
  { input: await cover('village_background', 'north') },
  { input: await strip('ground_sand_light', W, H - villageFloor), top: villageFloor, left: 0 },
]);

const platformTop = Math.round(H * 0.63);
const platformH = H - platformTop;
const leftW = Math.round(W * 0.2);
const rightW = Math.round(W * 0.2);
await saveStage('stage_bridge', [
  { input: await cover('background_cloudy') },
  { input: await strip('stone_block', leftW, platformH), top: platformTop, left: 0 },
  { input: await strip('stone_block', rightW, platformH), top: platformTop, left: W - rightW },
]);

const desertFloor = Math.round(H * 0.82);
await saveStage('stage_desert', [
  { input: await cover('background_desert', 'north') },
  { input: await strip('ground_stone', W, H - desertFloor), top: desertFloor, left: 0 },
]);

// Thumbnail for the games list.
const hero = await trimmed('hero_hold_', 420);
const king = await trimmed('demon_king_healthy', 560);
const bird = await trimmed('bird_landed', 150);
const heroMeta = await sharp(hero).metadata();
const kingMeta = await sharp(king).metadata();
await sharp({ create: { width: W, height: H, channels: 4, background: '#000000' } })
  .composite([
    { input: await cover('background_desert', 'north') },
    { input: await strip('ground_stone', W, H - desertFloor), top: desertFloor, left: 0 },
    { input: hero, left: 420 - Math.round(heroMeta.width / 2), top: desertFloor + 40 - heroMeta.height },
    { input: king, left: 1080 - Math.round(kingMeta.width / 2), top: desertFloor + 40 - kingMeta.height },
    { input: bird, left: 250, top: desertFloor - 380 },
  ])
  .webp({ quality: 82, effort: 5 })
  .toFile(path.join(out, 'thumbnail.webp'));

// ---- music ---------------------------------------------------------------------------
for (const f of readdirSync(src).filter((f) => f.toLowerCase().endsWith('.mp3'))) {
  copyFileSync(path.join(src, f), path.join(out, f.replace(/^music_/, '').replace(/__/g, '_').toLowerCase()));
}

console.log('Art written to', out);
