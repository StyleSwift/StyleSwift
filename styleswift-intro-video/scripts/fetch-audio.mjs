// Downloads the Mixkit music and sound effects listed in src/audio.json into public/audio/.
// The files are not committed: Mixkit's licenses forbid redistributing them on their own or with source files.
// curl does the download so HTTPS_PROXY is honoured.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, renameSync, rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(readFileSync(`${root}src/audio.json`, 'utf8'));
const ifMissing = process.argv.includes('--if-missing');

const sourceUrl = ({kind, id}) =>
  kind === 'music'
    ? `https://assets.mixkit.co/music/${id}/${id}.mp3`
    : `https://assets.mixkit.co/active_storage/sfx/${id}/${id}-preview.mp3`;

mkdirSync(`${root}public/audio`, {recursive: true});
for (const [key, item] of Object.entries(manifest)) {
  const dest = `${root}public/audio/${key}-${item.id}.mp3`; // same naming as audioFile() in src/script.ts
  if (ifMissing && existsSync(dest)) continue;
  // Download beside the target and rename only on success, so an interrupted run never leaves a truncated file.
  const part = `${dest}.part`;
  rmSync(part, {force: true});
  execFileSync('curl', ['-fsSL', '--retry', '2', '-o', part, sourceUrl(item)], {stdio: 'inherit'});
  renameSync(part, dest);
  console.log(`${key}: ${item.title} -> public/audio/${key}-${item.id}.mp3`);
}
