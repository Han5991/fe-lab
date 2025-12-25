import { cpSync, rmSync, mkdirSync, existsSync, lstatSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const POSTS_SOURCE_DIR = resolve(__dirname, '../posts');
const POSTS_TARGET_DIR = resolve(__dirname, 'public/posts');

const ALLOWED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.mp4',
];

console.log(
  `Syncing images from ${POSTS_SOURCE_DIR} to ${POSTS_TARGET_DIR}...`,
);

if (existsSync(POSTS_TARGET_DIR)) {
  console.log('Cleaning target directory...');
  rmSync(POSTS_TARGET_DIR, { recursive: true, force: true });
}

mkdirSync(POSTS_TARGET_DIR, { recursive: true });

try {
  cpSync(POSTS_SOURCE_DIR, POSTS_TARGET_DIR, {
    recursive: true,
    filter: source => {
      if (lstatSync(source).isDirectory()) {
        return true;
      }
      return ALLOWED_EXTENSIONS.includes(extname(source).toLowerCase());
    },
  });
  console.log('Successfully synced images.');
} catch (error) {
  console.error('Failed to sync images:', error);
  process.exit(1);
}
