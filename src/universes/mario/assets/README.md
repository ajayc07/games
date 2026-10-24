# mario/assets

Real art and sounds, named after the character id (`mario.avif`, `donkeykong.avif`, ...).
Drop a file here, then reference it in `../characters.ts` (or `../themes.ts`) with `asset('mario.avif')`.
Missing files fall back to generated placeholders.
Only files the game uses belong here (every file in this folder is bundled); raw material (sprite sheets, sources) goes in `_sources/` at the repo root, which is gitignored.
