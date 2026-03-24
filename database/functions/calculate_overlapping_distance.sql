-- Calculate overlapping distance between host route and rider's journey
-- Returns the distance (in meters) that both host and rider share
CREATE OR REPLACE FUNCTION calculate_overlapping_distance(
  p_host_from_point GEOGRAPHY,
  p_host_to_point GEOGRAPHY,
  p_rider_pickup_point GEOGRAPHY,
  p_rider_destination_point GEOGRAPHY
)
RETURNS NUMERIC AS $$
DECLARE
  v_overlapping_distance NUMERIC := 0;
  v_host_route_distance NUMERIC;
  v_rider_segment_length NUMERIC;
  v_pickup_on_route BOOLEAN;
  v_dest_on_route BOOLEAN;
  v_pickup_fraction NUMERIC;
  v_dest_fraction NUMERIC;
BEGIN
  -- Get host route distance
  v_host_route_distance := ST_Distance(p_host_from_point, p_host_to_point, true);
  
  -- Get rider's total segment length (pickup to destination)
  v_rider_segment_length := ST_Distance(p_rider_pickup_point, p_rider_destination_point, true);
  
  -- If rider segment is very short, return 0
  IF v_rider_segment_length < 10 THEN
    RETURN 0;
  END IF;
  
  -- Check if pickup point is close to host route (within 500m)
  v_pickup_on_route := ST_DWithin(
    ST_MakeLine(p_host_from_point::geometry, p_host_to_point::geometry)::geography,
    p_rider_pickup_point,
    500
  );
  
  -- Check if destination point is close to host route (within 500m)
  v_dest_on_route := ST_DWithin(
    ST_MakeLine(p_host_from_point::geometry, p_host_to_point::geometry)::geography,
    p_rider_destination_point,
    500
  );
  
  -- Both points must be on/near host route for overlap calculation
  IF NOT v_pickup_on_route OR NOT v_dest_on_route THEN
    RETURN 0;
  END IF;
  
  -- Calculate fractional positions along the route (0 to 1)
  -- Use ST_Project to find position
  v_pickup_fraction := ST_LineLocatePoint(
    ST_MakeLine(p_host_from_point::geometry, p_host_to_point::geometry),
    ST_ClosestPoint(
      ST_MakeLine(p_host_from_point::geometry, p_host_to_point::geometry),
      p_rider_pickup_point::geometry
    )
  );
  
  v_dest_fraction := ST_LineLocatePoint(
    ST_MakeLine(p_host_from_point::geometry, p_host_to_point::geometry),
    ST_ClosestPoint(
      ST_MakeLine(p_host_from_point::geometry, p_host_to_point::geometry),
      p_rider_destination_point::geometry
    )
  );
  
  -- Clamp fractions to valid range
  v_pickup_fraction := GREATEST(0, LEAST(1, v_pickup_fraction));
  v_dest_fraction := GREATEST(0, LEAST(1, v_dest_fraction));
  
  -- Overlapping distance is the portion between pickup and destination fractions
  -- If rider travels in same direction as host (dest_fraction > pickup_fraction)
  IF v_dest_fraction >= v_pickup_fraction THEN
    v_overlapping_distance := (v_dest_fraction - v_pickup_fraction) * v_host_route_distance;
  ELSE
    -- Rider travels opposite direction - minimal or no overlap
    v_overlapping_distance := 0;
  END IF;
  
  -- Round to meters
  RETURN ROUND(v_overlapping_distance);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
