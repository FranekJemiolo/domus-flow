-- DomusFlow Database Initialization
-- This script runs on first container startup

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE domus_flow TO domus_flow;
