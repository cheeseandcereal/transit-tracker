import 'source-map-support/register.js';
import { getLogger } from './logger.js';
const logger = getLogger('main');

async function main() {
  logger.info('Hello');
}

main().catch((e) => {
  logger.error('Uncaught fatal error:', e);
  process.exit(1);
});
