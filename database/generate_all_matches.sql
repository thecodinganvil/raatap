-- Script to generate match suggestions for all active ride templates
-- This is useful if you populated data without triggers enabled.

DO $$
DECLARE
    template_record RECORD;
    matches_found INTEGER;
    total_templates INTEGER := 0;
    total_matches INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting bulk match generation...';

    -- Loop through all active ride templates
    FOR template_record IN SELECT * FROM ride_templates WHERE status = 'active' LOOP
        
        total_templates := total_templates + 1;
        
        -- Call the matching function for this template
        -- This function compares the template against all active ride_requests
        matches_found := generate_match_suggestions_for_ride_template(template_record.id);
        
        IF matches_found > 0 THEN
            RAISE NOTICE 'Template %: Found % matches', template_record.id, matches_found;
            total_matches := total_matches + matches_found;
        ELSE
            -- RAISE NOTICE 'Template %: No matches found', template_record.id;
        END IF;
        
    END LOOP;

    RAISE NOTICE 'Finished. Processed % templates. Created % total match suggestions.', total_templates, total_matches;
END;
$$;
