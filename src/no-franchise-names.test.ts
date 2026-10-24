// Task 005d (D-038): nothing in the shipped sources may name the removed franchise or its characters.
// The banned words are stored reversed so this file does not contain them either. Files are read through
// Vite's import.meta.glob (raw text), so no Node APIs are needed.
import { describe, expect, it } from 'vitest';

const BANNED = ['oiram', 'igiul', 'hcaep', 'daot', 'reswob', 'ihsoy', 'yeknod', 'odnetnin'].map((w) => [...w].reverse().join(''));

const FILES: Record<string, string> = import.meta.glob(
  ['/src/**/*', '/public/**/*', '/scripts/**/*', '/README.md', '/index.html', '/vite.config.ts', '/package.json'],
  { query: '?raw', import: 'default', eager: true },
);
const BINARY = /\.(png|jpg|jpeg|webp|avif|mp3|ogg|wav|m4a|ico)$/i;

describe('no franchise names in shipped files (D-038)', () => {
  const paths = Object.keys(FILES);

  it('scans a real set of files', () => {
    expect(paths.length).toBeGreaterThan(50);
    expect(paths).toContain('/README.md');
    expect(paths).toContain('/index.html');
  });

  it('file names and text are free of the banned names', () => {
    const hits: string[] = [];
    for (const path of paths) {
      for (const w of BANNED) if (path.toLowerCase().includes(w)) hits.push(`${path} (file name: ${w})`);
      if (BINARY.test(path)) continue;
      const text = String(FILES[path]).toLowerCase();
      for (const w of BANNED) if (text.includes(w)) hits.push(`${path} (text: ${w})`);
    }
    expect(hits).toEqual([]);
  });
});
