-- Check if a unique index exists
SELECT * 
FROM pg_indexes 
WHERE tablename = 'driver_locations' AND indexname LIKE '%driver_id%';
[
  {
    "schemaname": "public",
    "tablename": "driver_locations",
    "indexname": "uq_driver_locations_driver_id",
    "tablespace": null,
    "indexdef": "CREATE UNIQUE INDEX uq_driver_locations_driver_id ON public.driver_locations USING btree (driver_id)"
  }
]