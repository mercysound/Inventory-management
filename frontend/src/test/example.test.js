// frontend/src/test/example.test.js
import { describe, it, expect } from 'vitest';

describe('Example Test Suite', () => {
  it('should perform basic calculation', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test string operations', () => {
    const message = 'Hello World';
    expect(message).toContain('Hello');
    expect(message.length).toBe(11);
  });
});
