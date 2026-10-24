# robo/assets

Real art and sounds for the Robo World universe. Empty for now: everything is drawn and synthesized in code
(robot parts, theme placeholders, chimes).
Drop a file here, then reference it in `../themes.ts` with `asset('<file>')` (theme textures such as
`grass-ground-top.png` are already looked up). Missing files fall back to generated placeholders.
Only original or licensed files the game uses belong here (every file in this folder is bundled); raw material
goes in `_sources/` at the repo root, which is gitignored.
