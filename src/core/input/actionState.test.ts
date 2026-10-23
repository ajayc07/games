import { describe, expect, it } from 'vitest';
import { ActionState, type ActionEvent } from './actionState';

function make() {
  const events: Array<[string, ActionEvent]> = [];
  const s = new ActionState((type, e) => events.push([type, e]));
  return { s, events };
}

describe('merging sources', () => {
  it('an action is down while at least one source holds it', () => {
    const { s } = make();
    s.set('key:ArrowLeft', 'left');
    s.set('pointer:1', 'left');
    expect(s.isDown('left')).toBe(true);
    s.release('key:ArrowLeft');
    expect(s.isDown('left')).toBe(true);
    s.release('pointer:1');
    expect(s.isDown('left')).toBe(false);
  });

  it('different sources can hold different actions at once (Left + Jump)', () => {
    const { s } = make();
    s.set('pointer:1', 'left');
    s.set('pointer:2', 'jump');
    expect(s.isDown('left')).toBe(true);
    expect(s.isDown('jump')).toBe(true);
  });

  it('emits press/release only on merged edges', () => {
    const { s, events } = make();
    s.set('a', 'jump', 1);
    s.set('b', 'jump', 2);
    s.release('a', 3);
    s.release('b', 4);
    expect(events).toEqual([
      ['press', { action: 'jump', time: 1 }],
      ['release', { action: 'jump', time: 4 }],
    ]);
  });

  it('a pointer sliding from Left to Right switches without a gap', () => {
    const { s, events } = make();
    s.set('pointer:1', 'left', 1);
    s.set('pointer:1', null, 2); // between the buttons
    s.set('pointer:1', 'right', 3);
    expect(s.isDown('left')).toBe(false);
    expect(s.isDown('right')).toBe(true);
    s.set('pointer:1', 'left', 4); // direct switch, no gap
    expect(s.isDown('left')).toBe(true);
    expect(s.isDown('right')).toBe(false);
    expect(events.map(([t, e]) => `${t}:${e.action}`)).toEqual([
      'press:left',
      'release:left',
      'press:right',
      'press:left',
      'release:right',
    ]);
  });

  it('null raw values hold nothing', () => {
    const { s } = make();
    s.set('pointer:1', null);
    expect(['left', 'right', 'jump', 'power'].some((a) => s.isDown(a as never))).toBe(false);
  });

  it('releaseAll by prefix clears only matching sources (pointer cancel / blur)', () => {
    const { s } = make();
    s.set('pointer:1', 'left');
    s.set('pointer:2', 'jump');
    s.set('key:KeyX', 'power');
    s.releaseAll('pointer:');
    expect(s.isDown('left')).toBe(false);
    expect(s.isDown('jump')).toBe(false);
    expect(s.isDown('power')).toBe(true);
    s.releaseAll();
    expect(s.isDown('power')).toBe(false);
  });

  it('setting the same value twice is a no-op (key repeat)', () => {
    const { s, events } = make();
    s.set('key:Space', 'jump');
    s.set('key:Space', 'jump');
    s.set('key:Space', 'jump');
    expect(events.length).toBe(1);
  });
});

describe('edge detection', () => {
  it('justPressed / justReleased last exactly one frame', () => {
    const { s } = make();
    s.set('k', 'jump');
    expect(s.justPressed('jump')).toBe(false); // not visible until the frame starts
    s.endFrame();
    expect(s.justPressed('jump')).toBe(true);
    s.endFrame();
    expect(s.justPressed('jump')).toBe(false);
    expect(s.isDown('jump')).toBe(true);
    s.release('k');
    s.endFrame();
    expect(s.justReleased('jump')).toBe(true);
    s.endFrame();
    expect(s.justReleased('jump')).toBe(false);
  });

  it('a tap shorter than one frame still counts as a press', () => {
    const { s } = make();
    s.set('pointer:1', 'jump');
    s.release('pointer:1');
    s.endFrame();
    expect(s.justPressed('jump')).toBe(true);
    expect(s.justReleased('jump')).toBe(true);
    expect(s.isDown('jump')).toBe(false);
  });
});

describe('enabled-action filtering', () => {
  it('disabled actions never fire from any source', () => {
    const { s, events } = make();
    s.configure({ enabled: ['jump'], tapAnywhereJumps: false });
    s.set('key:ArrowLeft', 'left');
    s.set('pad:0:b2', 'power');
    s.endFrame();
    expect(s.isDown('left')).toBe(false);
    expect(s.justPressed('power')).toBe(false);
    expect(events).toEqual([]);
    s.set('key:Space', 'jump');
    expect(s.isDown('jump')).toBe(true);
  });

  it('disabling a held action releases it; re-enabling presses it again', () => {
    const { s, events } = make();
    s.set('key:ArrowLeft', 'left');
    s.configure({ enabled: ['jump'], tapAnywhereJumps: false });
    expect(s.isDown('left')).toBe(false);
    s.configure({ enabled: ['left', 'jump'], tapAnywhereJumps: false });
    expect(s.isDown('left')).toBe(true);
    expect(events.map(([t]) => t)).toEqual(['press', 'release', 'press']);
  });

  it('reports the current config', () => {
    const { s } = make();
    s.configure({ enabled: ['jump', 'left'], tapAnywhereJumps: true });
    expect(s.config).toEqual({ enabled: ['left', 'jump'], tapAnywhereJumps: true });
  });
});

describe('tap anywhere', () => {
  it('any source, mapped or not, counts as jump', () => {
    const { s } = make();
    s.configure({ enabled: ['jump'], tapAnywhereJumps: true });
    s.set('pointer:1', null); // tap on empty sky
    expect(s.isDown('jump')).toBe(true);
    s.release('pointer:1');
    s.set('key:KeyQ', null); // unbound key
    expect(s.isDown('jump')).toBe(true);
    s.release('key:KeyQ');
    s.set('key:ArrowLeft', 'left'); // bound to something else
    expect(s.isDown('jump')).toBe(true);
    expect(s.isDown('left')).toBe(false);
  });

  it('two fingers then one lifted keeps jump held; no double press', () => {
    const { s, events } = make();
    s.configure({ enabled: ['jump'], tapAnywhereJumps: true });
    s.set('pointer:1', null);
    s.set('pointer:2', null);
    s.release('pointer:1');
    expect(s.isDown('jump')).toBe(true);
    expect(events.filter(([t]) => t === 'press').length).toBe(1);
  });

  it('does nothing if jump itself is disabled', () => {
    const { s } = make();
    s.configure({ enabled: ['left'], tapAnywhereJumps: true });
    s.set('pointer:1', null);
    expect(s.isDown('jump')).toBe(false);
    expect(s.isDown('left')).toBe(false);
  });

  it('turning tap-anywhere off maps held sources back to their own action', () => {
    const { s } = make();
    s.configure({ enabled: ['left', 'jump'], tapAnywhereJumps: true });
    s.set('key:ArrowLeft', 'left');
    expect(s.isDown('jump')).toBe(true);
    s.configure({ enabled: ['left', 'jump'], tapAnywhereJumps: false });
    expect(s.isDown('jump')).toBe(false);
    expect(s.isDown('left')).toBe(true);
  });
});
