/**
 * Centralized error handling middleware
 */

import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Prisma known errors
  if (err.message?.includes('Unique constraint')) {
    res.status(409).json({
      success: false,
      error: 'A record with this value already exists',
    });
    return;
  }

  if (
    err.message?.includes('Record to update not found') ||
    err.message?.includes('Record to delete not found')
  ) {
    res.status(404).json({
      success: false,
      error: 'Record not found',
    });
    return;
  }

  // Unknown errors - don't leak details in production
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
