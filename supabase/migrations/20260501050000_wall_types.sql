BEGIN;

ALTER TABLE walls
    ADD COLUMN wall_type TEXT NOT NULL DEFAULT 'boulder';

ALTER TABLE walls
    ALTER COLUMN wall_type DROP DEFAULT;

ALTER TABLE walls
    ADD CONSTRAINT wall_type_valid CHECK (wall_type IN ('boulder', 'rope'));

-- Hobart rope walls (gym ID 1)
INSERT INTO walls (gym, name, wall_type) VALUES
    (1, 'Top-rope room', 'rope'),
    (1, 'Lift well', 'rope'),
    (1, 'Steep lead', 'rope'),
    (1, 'Flat lead', 'rope'),
    (1, 'Roof lead', 'rope');

COMMIT;
