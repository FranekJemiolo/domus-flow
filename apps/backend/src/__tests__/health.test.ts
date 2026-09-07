/**
 * Backend health check smoke test (Milestone 1)
 * Full integration tests added in Milestone 2
 */

import request from 'supertest';
import { createApp } from '../app';

describe('Health Check', () => {
  const app = createApp();

  it('GET /health returns 200 with status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('domus-flow-api');
    expect(response.body.timestamp).toBeDefined();
  });
});
