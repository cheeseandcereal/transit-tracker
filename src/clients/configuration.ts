import { readFileSync } from 'node:fs';
import { ConfigFile } from '../types.js';

const CONFIG_FILE_PATH = 'runtime/config.json';

export class Config {
  public static configCache?: ConfigFile = undefined;

  public static getConfig() {
    if (!Config.configCache) Config.reloadConfig();
    return Config.configCache as ConfigFile;
  }

  public static reloadConfig() {
    Config.configCache = JSON.parse(readFileSync(CONFIG_FILE_PATH, 'utf8'));
  }
}
