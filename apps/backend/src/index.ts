/**
 * DomusFlow Backend API
 * Server entry point
 */

import { createApp } from './app';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║         DomusFlow API Server             ║
║  Running on: http://localhost:${PORT}       ║
║  Environment: ${process.env.NODE_ENV?.padEnd(9) || 'development'}             ║
╚══════════════════════════════════════════╝
    `);
  });
}

main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
