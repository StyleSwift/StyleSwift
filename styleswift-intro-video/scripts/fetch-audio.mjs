// Downloads the Mixkit music and sound effects listed in src/audio.json into public/audio/.
// The files are not committed: Mixkit's licenses forbid redistributing them on their own or with source files.
// curl does the download so HTTPS_PROXY is honoured.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync} from 'node:fs';
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
  const dest = `${root}public/audio/${item.file}`;
  if (ifMissing && existsSync(dest)) continue;
  execFileSync('curl', ['-fsSL', '--retry', '2', '-o', dest, sourceUrl(item)], {stdio: 'inherit'});
  console.log(`${key}: ${item.title} -> public/audio/${item.file}`);
}
