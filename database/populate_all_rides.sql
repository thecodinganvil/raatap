-- Script to populate ride templates and requests for ALL profiles
-- It will attempt to create a ride for every profile based on their preferences
-- and skip any that fail.

DO $$
DECLARE
    profile_record RECORD;
    ride_id UUID;
    success_count INTEGER := 0;
    failure_count INTEGER := 0;
    res JSON;
BEGIN
    RAISE NOTICE 'Starting bulk ride creation...';

    FOR profile_record IN SELECT * FROM profiles LOOP
        
        -- 1. IF USER IS A HOST: Create Ride Template
        IF profile_record.prefer_hosting = true THEN
            BEGIN
                -- Check if template already exists to avoid duplicates (optional but good practice)
                IF NOT EXISTS (SELECT 1 FROM ride_templates WHERE host_id = profile_record.id AND status = 'active') THEN
                    
                    res := create_ride_template_from_profile(
                        profile_record.id,
                        '4_wheeler', -- Default vehicle type
                        3,           -- Default seats
                        5000,        -- Default max detour
                        '18:00:00'   -- Default return time
                    );
                    
                    IF (res->>'success')::BOOLEAN = true THEN
                        RAISE NOTICE 'Created template for host: %', profile_record.id;
                        success_count := success_count + 1;
                    ELSE
                        RAISE WARNING 'Failed to create template for host %: %', profile_record.id, res->>'error';
                        failure_count := failure_count + 1;
                    END IF;
                ELSE
                    RAISE NOTICE 'Skipping host % (template already exists)', profile_record.id;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Error processing host %: %', profile_record.id, SQLERRM;
                failure_count := failure_count + 1;
            END;
        END IF;

        -- 2. IF USER IS A RIDER: Create Ride Request
        IF profile_record.prefer_taking_ride = true THEN
            BEGIN
                -- Check if request already exists
                IF NOT EXISTS (SELECT 1 FROM ride_requests WHERE rider_id = profile_record.id AND status = 'active') THEN
                    
                    res := create_ride_request_from_profile(
                        profile_record.id,
                        '09:00:00',  -- Default preferred arrival
                        30,          -- Default flexibility
                        'any',       -- Default vehicle pref
                        'both'       -- Default gender pref
                    );
                    
                    IF (res->>'success')::BOOLEAN = true THEN
                        RAISE NOTICE 'Created request for rider: %', profile_record.id;
                        success_count := success_count + 1;
                    ELSE
                        RAISE WARNING 'Failed to create request for rider %: %', profile_record.id, res->>'error';
                        failure_count := failure_count + 1;
                    END IF;
                ELSE
                     RAISE NOTICE 'Skipping rider % (request already exists)', profile_record.id;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Error processing rider %: %', profile_record.id, SQLERRM;
                failure_count := failure_count + 1;
            END;
        END IF;
        
    END LOOP;

    RAISE NOTICE 'Finished. Successes: %, Failures: %', success_count, failure_count;
END;
$$;
