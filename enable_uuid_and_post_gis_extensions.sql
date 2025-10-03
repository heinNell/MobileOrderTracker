-- Step 1: Enable Required Extensions
-- Run this FIRST before running schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS extension (required for geography and geometry types)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Verify extensions are installed
SELECT 
    extname AS "Extension Name",
    extversion AS "Version"
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'postgis')
ORDER BY extname;

