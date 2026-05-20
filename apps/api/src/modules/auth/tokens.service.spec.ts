import { TokensService } from './tokens.service';

describe('TokensService static helpers', () => {
  describe('hash', () => {
    it('produces a 64-char SHA-256 hex digest', () => {
      const hash = TokensService.hash('hello');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic', () => {
      expect(TokensService.hash('x')).toBe(TokensService.hash('x'));
    });

    it('differs between inputs', () => {
      expect(TokensService.hash('a')).not.toBe(TokensService.hash('b'));
    });
  });

  describe('randomToken', () => {
    it('returns base64url, ≥ 64 chars for the default 48 bytes', () => {
      const token = TokensService.randomToken();
      expect(token.length).toBeGreaterThanOrEqual(64);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('is unique across calls', () => {
      const set = new Set([
        TokensService.randomToken(),
        TokensService.randomToken(),
        TokensService.randomToken(),
      ]);
      expect(set.size).toBe(3);
    });
  });

  describe('expirationFromString', () => {
    it('parses 15m', () => {
      const before = Date.now();
      const result = TokensService.expirationFromString('15m').getTime();
      const delta = result - before;
      expect(delta).toBeGreaterThanOrEqual(15 * 60_000 - 100);
      expect(delta).toBeLessThan(15 * 60_000 + 1000);
    });

    it('parses 7d', () => {
      const delta = TokensService.expirationFromString('7d').getTime() - Date.now();
      expect(delta).toBeGreaterThanOrEqual(7 * 86_400_000 - 100);
    });

    it('parses 30s', () => {
      const delta = TokensService.expirationFromString('30s').getTime() - Date.now();
      expect(delta).toBeGreaterThanOrEqual(30_000 - 100);
      expect(delta).toBeLessThan(30_000 + 1000);
    });

    it('throws on a malformed input', () => {
      expect(() => TokensService.expirationFromString('15')).toThrow(/Invalid duration/);
      expect(() => TokensService.expirationFromString('xyz')).toThrow(/Invalid duration/);
    });
  });
});
