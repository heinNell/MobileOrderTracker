SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'driver_locations';

[
  {
    "trigger_name": "trg_fill_driver_location",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION fill_driver_location_from_latlng()"
  },
  {
    "trigger_name": "trg_fill_driver_location",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION fill_driver_location_from_latlng()"
  },
  {
    "trigger_name": "trg_fill_driver_location_and_propagate",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION fill_driver_location_and_propagate()"
  },
  {
    "trigger_name": "trg_fill_driver_location_and_propagate",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION fill_driver_location_and_propagate()"
  }
]