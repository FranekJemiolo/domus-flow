/**
 * Global test setup - runs before all test suites
 * Sets up environment variables for the test database
 */

export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgresql://domus_flow:domus_flow_dev@localhost:5432/domus_flow_test';
  process.env.JWT_SECRET = 'test-jwt-secret-not-for-production';
  process.env.PORT = '3099';

  console.log('🧪 Test environment initialized');
  console.log(`📦 DATABASE_URL: ${process.env.DATABASE_URL}`);
}
