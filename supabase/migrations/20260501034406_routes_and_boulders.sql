BEGIN;

-- 1. Reference table for rope grades.
--    Using the grade itself as the primary key — these values are
--    stable and small, and it makes climbs.rope_grade directly readable
--    when debugging without needing a join.
CREATE TABLE rope_grades (
    id          SMALLINT PRIMARY KEY CHECK (id BETWEEN 12 AND 29),
    sort_order  SMALLINT NOT NULL UNIQUE
);

ALTER TABLE rope_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_read_all" ON rope_grades
    FOR SELECT USING (true);


INSERT INTO rope_grades (id, sort_order) VALUES
    (12, 12), (13, 13), (14, 14), (15, 15), (16, 16), (17, 17),
    (18, 18), (19, 19), (20, 20), (21, 21), (22, 22), (23, 23),
    (24, 24), (25, 25), (26, 26), (27, 27), (28, 28), (29, 29);

-- 2. Add climb_type. DEFAULT 'boulder' backfills existing rows;
--    we then drop the default so future inserts must be explicit.
ALTER TABLE climbs
    ADD COLUMN climb_type TEXT NOT NULL DEFAULT 'boulder';

ALTER TABLE climbs
    ALTER COLUMN climb_type DROP DEFAULT;

-- 3. Add the rope_grade FK column (nullable — only set for rope climbs).
ALTER TABLE climbs
    ADD COLUMN rope_grade SMALLINT REFERENCES rope_grades(id);

-- 4. Loosen tag_colour to allow NULL for rope climbs.
ALTER TABLE climbs
    ALTER COLUMN tag_colour_id DROP NOT NULL;

-- 5. Constraints: valid type, and exactly-one-grade-source per type.
ALTER TABLE climbs
    ADD CONSTRAINT climb_type_valid
        CHECK (climb_type IN ('boulder', 'rope')),
    ADD CONSTRAINT grade_matches_type
        CHECK (
            (climb_type = 'boulder'
                AND tag_colour_id IS NOT NULL
                AND rope_grade IS NULL)
            OR
            (climb_type = 'rope'
                AND rope_grade IS NOT NULL
                AND tag_colour_id IS NULL)
        );

-- 6. Index the new FK — Postgres doesn't index FKs automatically,
--    and you'll likely filter/join on it.
CREATE INDEX idx_climbs_rope_grade ON climbs (rope_grade);

COMMIT;