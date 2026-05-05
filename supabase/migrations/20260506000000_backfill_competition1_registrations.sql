-- Backfill all existing profiles into competition 1.
-- Competitor numbers are preserved from profiles.competitor_number.
-- Category is derived by matching competition_categories.name to profiles.age_category.
-- Profiles with no age_category (NULL) are excluded.
INSERT INTO competition_registrations (profile_id, competition_id, category_id, competitor_number)
SELECT
    p.profile_id,
    cc.competition_id,
    cc.id AS category_id,
    p.competitor_number::INT
FROM profiles p
JOIN competition_categories cc
    ON  cc.competition_id = 1
    AND lower(cc.name) = lower(p.age_category)
WHERE p.age_category IS NOT NULL
ON CONFLICT (profile_id, competition_id) DO NOTHING;
