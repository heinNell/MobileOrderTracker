-- Check if PostGIS is available and enable it
-- Run this FIRST before anything else

-- Check what extensions are available
SELECT 
    name,
    default_version,
    installed_version,
    comment
FROM pg_available_extensions
WHERE name IN ('postgis', 'uuid-ossp', 'postgis_topology')
ORDER BY name;

-- Try to enable PostGIS
CREATE EXTENSION IF NOT EXISTS "postgis" CASCADE;

-- Try to enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify they are now enabled
SELECT 
    extname AS "Extension",
    extversion AS "Version"
FROM pg_extension
WHERE extname IN ('postgis', 'uuid-ossp')
ORDER BY extname;
