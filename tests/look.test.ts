import { describe, expect, it } from 'vitest';
import { emptyPresentation, sceneLook, withSceneLook } from '../src/lib/look';
import { resolveScene } from '../src/lib/presentation';
import { DEFAULT_OPTIONS } from '../src/lib/types';

describe('answer card position', () => {
  it('defaults to the usual place', () => {
    expect(resolveScene(emptyPresentation(), 'a').options).toEqual(DEFAULT_OPTIONS);
  });

  it('round-trips through a screen rule and overrides only what is set', () => {
    const look = { ...sceneLook(null, 'a'), options: { x: 50, width: 40 } };
    const p = withSceneLook(emptyPresentation(), 'a', look);
    expect(sceneLook(p, 'a').options).toEqual({ x: 50, width: 40 });
    expect(resolveScene(p, 'a').options).toEqual({ x: 50, y: DEFAULT_OPTIONS.y, width: 40 });
    expect(resolveScene(p, 'b').options).toEqual(DEFAULT_OPTIONS);
  });
});
