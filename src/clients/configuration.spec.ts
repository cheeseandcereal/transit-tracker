import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { type fs, vol } from 'memfs';
import { Config } from './configuration.js';

vi.mock('node:fs', async () => {
  const memfs: { fs: typeof fs } = await vi.importActual('memfs');
  return {
    promises: memfs.fs.promises,
    readFileSync: vi.fn().mockImplementation((path, options) => vol.readFileSync(path, options)),
  };
});

describe('Config', () => {
  beforeEach(() => {
    Config.configCache = undefined;
    vol.fromJSON({ 'runtime/config.json': '{"some":"data"}' });
  });

  afterEach(() => {
    vol.reset();
  });

  describe('getConfig', () => {
    it('gets config from runtime/config.json', () => {
      expect(Config.getConfig()).to.deep.equal({ some: 'data' });
    });

    it('uses cached config and only reads from disk once', () => {
      expect(Config.getConfig()).to.deep.equal({ some: 'data' });
      vol.fromJSON({ 'runtime/config.json': '{"new":"data"}' });
      expect(Config.getConfig()).to.deep.equal({ some: 'data' });
    });
  });

  describe('reloadConfig', () => {
    it('will reload/cache new data from disk for getConfig', () => {
      vol.fromJSON({ 'runtime/config.json': '{"new":"data"}' });
      Config.reloadConfig();
      expect(Config.getConfig()).to.deep.equal({ new: 'data' });
    });
  });
});
