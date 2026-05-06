import { describe, it, expect } from 'vitest';
import { sanitizeReason, validateReason, REASON_MESSAGES } from './rotateReasonValidation';

describe('sanitizeReason', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeReason('   hello world   ')).toBe('hello world');
  });

  it('collapses repeated whitespace into a single space', () => {
    expect(sanitizeReason('hello\t\t\nworld   here')).toBe('hello world here');
  });

  it('removes control characters', () => {
    expect(sanitizeReason('foo\u0000bar\u0007baz\u007Fend')).toBe('foo bar baz end');
  });

  it('truncates to 500 characters', () => {
    const out = sanitizeReason('a'.repeat(600));
    expect(out.length).toBe(500);
  });

  it('returns empty string for whitespace-only input', () => {
    expect(sanitizeReason('   \n\t  ')).toBe('');
  });

  it('preserves accented and unicode letters', () => {
    expect(sanitizeReason('  Révocation clé é à ç  ')).toBe('Révocation clé é à ç');
  });
});

describe('validateReason', () => {
  const TOO_SHORT = REASON_MESSAGES.tooShort;
  const TOO_LONG = REASON_MESSAGES.tooLong;
  const NEEDS_LETTERS = REASON_MESSAGES.needsLetters;
  const REPEATED = REASON_MESSAGES.repeated;
  const ONLY_SYMBOLS = REASON_MESSAGES.onlySymbols;

  it('rejects empty string', () => {
    expect(validateReason('')).toBe(TOO_SHORT);
  });

  it('rejects 9 characters (just below threshold)', () => {
    expect(validateReason('abcdefghi')).toBe(TOO_SHORT);
  });

  it('accepts exactly 10 characters with enough letters', () => {
    expect(validateReason('abcdefghij')).toBeNull();
  });

  it('accepts exactly 500 characters after sanitization', () => {
    const reason = 'rotation '.repeat(60).trim().slice(0, 500); // 500 chars
    expect(reason.length).toBeLessThanOrEqual(500);
    const padded = reason.padEnd(500, 'x');
    expect(validateReason(padded)).toBeNull();
  });

  it('accepts input of 501 chars because sanitize truncates to 500', () => {
    const input = 'rotation prévue '.repeat(40); // > 500 chars, plenty of letters
    expect(input.length).toBeGreaterThan(500);
    expect(validateReason(input)).toBeNull();
  });

  it('rejects input that becomes < 10 chars after whitespace collapse', () => {
    expect(validateReason('   a b   ')).toBe(TOO_SHORT);
  });

  it('rejects symbol-only input (caught by letters check first)', () => {
    expect(validateReason('!!!@@@###$$$')).toBe(NEEDS_LETTERS);
  });

  it('rejects repeated single character (e.g. aaaaaaaaaa)', () => {
    expect(validateReason('aaaaaaaaaa')).toBe(REPEATED);
  });

  it('rejects when fewer than 5 letters even if length is OK', () => {
    expect(validateReason('1234567890ab')).toBe(NEEDS_LETTERS);
  });

  it('accepts a realistic rotation reason', () => {
    expect(validateReason('Rotation trimestrielle prévue par la politique sécurité')).toBeNull();
  });

  it('accepts reason with control characters that get cleaned', () => {
    expect(validateReason('Rotation\u0000 trimestrielle prévue')).toBeNull();
  });

  it('rejects reason that is only spaces and control characters', () => {
    expect(validateReason('\u0000\u0007   \t\n')).toBe(TOO_SHORT);
  });
});
