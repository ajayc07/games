// Every file in ./assets/ is bundled with this universe's chunk (hashed name, cached by the
// service worker on first use). Drop a file in, then reference it by file name in manifest.ts.
const files = import.meta.glob<string>('./assets/*.{png,webp,avif,jpg,mp3,ogg,m4a,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** URL of a file in ./assets/, or undefined if it is not there (callers fall back to placeholders). */
export function asset(fileName: string): string | undefined {
  return files[`./assets/${fileName}`];
}
