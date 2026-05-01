BEGIN;

-- is_current and its unique index are defined in 20260501060000_competitions.sql.
-- Mark Rope comp '26 as the active competition (new climbs will be assigned here
-- by the trigger defined in that migration).
UPDATE competitions SET is_current = true WHERE name = 'Rope comp ''26';

-- Replace the leaderboard_stats VIEW with a parameterised function so the
--    caller can scope results to a single competition or request all-time totals.
--    Passing NULL (the default) returns all-time aggregates.
DROP VIEW IF EXISTS leaderboard_stats;

CREATE OR REPLACE FUNCTION public.leaderboard_stats(p_competition_id BIGINT DEFAULT NULL)
RETURNS TABLE (
    profile_id      UUID,
    user_id         UUID,
    competitor_number BIGINT,
    comp_cohort     TEXT,
    age_category    TEXT,
    total_sends     BIGINT,
    total_points    BIGINT,
    pumpfest_sends  BIGINT,
    pumpfest_points BIGINT
) LANGUAGE sql SECURITY INVOKER STABLE AS $$
    SELECT
        p.profile_id,
        p.user_id,
        p.competitor_number,
        p.comp_cohort,
        p.age_category,
        -- Only count ascents belonging to the requested competition (or all if NULL).
        count(a.id) FILTER (
            WHERE a.sent = true
              AND (p_competition_id IS NULL OR c.competition_id = p_competition_id)
        )::BIGINT AS total_sends,
        COALESCE(SUM(
            CASE
                WHEN a.sent = true
                 AND (p_competition_id IS NULL OR c.competition_id = p_competition_id)
                THEN CASE WHEN lower(w.name::text) = 'pumpfest' THEN 2 ELSE 1 END
                ELSE 0
            END
        ), 0)::BIGINT AS total_points,
        count(a.id) FILTER (
            WHERE a.sent = true
              AND (p_competition_id IS NULL OR c.competition_id = p_competition_id)
              AND lower(w.name::text) = 'pumpfest'
        )::BIGINT AS pumpfest_sends,
        COALESCE(SUM(
            CASE
                WHEN a.sent = true
                 AND (p_competition_id IS NULL OR c.competition_id = p_competition_id)
                 AND lower(w.name::text) = 'pumpfest'
                THEN 2
                ELSE 0
            END
        ), 0)::BIGINT AS pumpfest_points
    FROM public.profiles p
    LEFT JOIN public.ascents a  ON a.profile_id = p.profile_id
    LEFT JOIN public.climbs  c  ON c.id = a.climb_id
    LEFT JOIN public.walls   w  ON w.id = c.wall
    GROUP BY p.profile_id, p.user_id, p.competitor_number,
             p.comp_cohort, p.age_category;
$$;

GRANT EXECUTE ON FUNCTION public.leaderboard_stats(BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION public.leaderboard_stats(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_stats(BIGINT) TO service_role;

COMMIT;
