# core/levels

Universe-agnostic level engine: format + validation (`format.ts`), grid logic (`grid.ts`), shared physics tuning
(`physics.ts`), walking (`walk.ts`), the generic `LevelScene`, `Player` (also the demo ghost), the "watch me" demo
(`demo.ts`, `demoFx.ts`), shooting (`shots.ts` pure, `Blaster.ts`) and bubbles (`bubbles.ts` pure, `BubbleField.ts`),
level order (`progression.ts`), themes, placeholder textures, parallax background and
result screen. How the player is drawn lives in `core/avatar/`.
See docs/architecture/levels.md, "Levels".
