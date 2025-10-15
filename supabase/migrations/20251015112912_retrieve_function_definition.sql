SELECT pg_get_functiondef('public.sync_driver_location_and_broadcast'::regproc);

[
  {
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.fill_driver_location_from_latlng()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  IF (NEW.location IS NULL) THEN\r\n    IF (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL) THEN\r\n      NEW.location := jsonb_build_object('lat', NEW.latitude, 'lng', NEW.longitude);\r\n    ELSE\r\n      -- leave NULL so constraint will still fail (or set to empty object if preferred)\r\n      -- NEW.location := '{}'::jsonb;\r\n    END IF;\r\n  END IF;\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  }
]