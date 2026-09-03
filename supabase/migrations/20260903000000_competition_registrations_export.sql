CREATE OR REPLACE FUNCTION public.get_competition_registrations_for_export(p_competition_id BIGINT)
RETURNS TABLE (
    profile_id UUID,
    user_id UUID,
    username TEXT,
    email TEXT,
    phone_number TEXT,
    comp_cohort TEXT,
    age_category TEXT,
    role TEXT,
    competitor_number INT,
    category_name TEXT,
    registered_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
    SELECT
        p.profile_id,
        p.user_id,
        p.username,
        COALESCE(u.email, '')::TEXT AS email,
        p.phone_number,
        p.comp_cohort,
        p.age_category,
        p.role,
        cr.competitor_number,
        cc.name AS category_name,
        cr.registered_at
    FROM public.competition_registrations cr
    INNER JOIN public.profiles p
        ON p.profile_id = cr.profile_id
    LEFT JOIN auth.users u
        ON u.id = p.user_id
    LEFT JOIN public.competition_categories cc
        ON cc.id = cr.category_id
    WHERE cr.competition_id = p_competition_id
    ORDER BY cr.competitor_number ASC,
             p.username ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_competition_registrations_for_export(BIGINT)
    TO authenticated, service_role;
