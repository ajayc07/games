# core/audio

`AudioManager` (`audio` singleton): Web Audio unlocked on the first gesture, sounds from files when a registered
entry has one, otherwise the synth recipes in `recipes.ts`. `chimes.ts` builds each avatar option's pick and win
chimes from one recipe (pitch + timbre, D-038); `chimePlayer.ts` registers and plays them. `voiceLimiter.ts` caps
voices per sound and the retrigger gap; `pendingQueue.ts` keeps the sounds asked for while audio unlocks.
