import { describe, expect, it } from '@jest/globals';
import { greet } from '../src';

describe('greet', () => {
  it('greets the provided name', () => {
    expect(greet('Boostpack')).toBe('Hello, Boostpack!');
  });
});
