/**
 * DomusFlow Backend API
 * Express application factory
 */

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Route imports (added in Milestone 2)
// import { authRouter } from './routes/auth';
// import { propertiesRouter } from './routes/properties';
// import { ticketsRouter } from './routes/tickets';
// import { messagesRouter } from './routes/messages';
// import { dashboardRouter } from './routes/dashboard';

// Middleware imports
// import { errorHandler } from './middleware/errorHandler';
// import { notFound } from './middleware/notFound';

export function createApp() {
  const app = express();

  // ─── Security & Middleware ───────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '50mb' })); // Allow base64 images
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // ─── Health Check ────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'domus-flow-api',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // ─── API Routes (Milestone 2) ────────────────────────────────────────────
  // app.use('/api/auth', authRouter);
  // app.use('/api/properties', propertiesRouter);
  // app.use('/api/tickets', ticketsRouter);
  // app.use('/api/messages', messagesRouter);
  // app.use('/api/dashboard', dashboardRouter);

  // ─── Error Handling (Milestone 2) ────────────────────────────────────────
  // app.use(notFound);
  // app.use(errorHandler);

  return app;
}
