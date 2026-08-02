import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCANS,
  decodeJwtPayload,
  getAuthorizedPartyOrigin,
  getScansRemainingClaim,
} from '../auth';

function base64Url(input: string): string {
  const btoaFn = (globalThis as { btoa?: (value: string) => string }).btoa;
  if (typeof btoaFn === 'function') {
    return btoaFn(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  const buffer = (globalThis as unknown as {
    Buffer?: { from(input: string): { toString(encoding: 'base64url'): string } };
  }).Buffer;
  if (!buffer) {
    throw new Error('No base64url encoder is available in this runtime.');
  }
  return buffer.from(input).toString('base64url');
}

function jwt(payload: Record<string, unknown>): string {
  return `${base64Url('{"alg":"none"}')}.${base64Url(JSON.stringify(payload))}.`;
}

describe('auth claim helpers', () => {
  it('decodes a JWT payload without verifying it', () => {
    expect(decodeJwtPayload(jwt({ azp: 'https://example.com/app', scansRemaining: 0 }))).toMatchObject({
      azp: 'https://example.com/app',
      scansRemaining: 0,
    });
  });

  it('returns a normalized authorized-party origin', () => {
    expect(getAuthorizedPartyOrigin(jwt({ azp: 'https://example.com/path?x=1' }))).toBe(
      'https://example.com',
    );
  });

  it('rejects invalid authorized-party origins', () => {
    expect(getAuthorizedPartyOrigin(jwt({ azp: 'chrome-extension://abc' }))).toBeNull();
    expect(getAuthorizedPartyOrigin(jwt({ azp: 'not-a-url' }))).toBeNull();
  });

  it('reads finite scan claims, approved unlimited users, and permissive defaults', () => {
    expect(getScansRemainingClaim(jwt({ scansRemaining: 0 }))).toBe(0);
    expect(getScansRemainingClaim(jwt({ scansRemaining: 4 }))).toBe(4);
    expect(getScansRemainingClaim(jwt({ tier: 'approved', scansRemaining: 0 }))).toBeNull();
    expect(getScansRemainingClaim(jwt({}))).toBe(DEFAULT_SCANS);
    expect(getScansRemainingClaim(null)).toBe(DEFAULT_SCANS);
  });
});
