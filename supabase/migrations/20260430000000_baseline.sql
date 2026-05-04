-- ============================================================
-- Squashed baseline: production schema as of 2026-05-04
-- Replaces migrations: 20260430004325, 20260430110314,
--   20260430204325, 20260501034406, 20260501050000,
--   20260501060000, 20260501070000
-- ============================================================

-- ============================================================
-- Schema
-- ============================================================
SET check_function_bodies = false;

COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE OR REPLACE FUNCTION "public"."climbs_assign_current_competition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.competition_id IS NULL THEN
        SELECT id INTO NEW.competition_id
        FROM competitions
        WHERE is_current = true
        LIMIT 1;
        IF NEW.competition_id IS NULL THEN
            RAISE EXCEPTION 'No current competition is set. Mark a competition as current before adding climbs.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."climbs_assign_current_competition"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."create_anonymous_ascent"("p_competitor_number" bigint, "p_climb_id" "uuid", "p_sent" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_ascent_id uuid;
  v_existing_id uuid;
  v_profile_id uuid;
  v_user_id uuid;
BEGIN
  -- Look up profile_id and user_id from competitor_number
  SELECT profile_id, user_id INTO v_profile_id, v_user_id
  FROM public.profiles
  WHERE competitor_number = p_competitor_number
  LIMIT 1;

  -- Verify competitor_number exists and we found a profile
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Competitor number % does not exist', p_competitor_number;
  END IF;

  -- Check if ascent already exists for this profile and climb
  SELECT id INTO v_existing_id
  FROM public.ascents
  WHERE profile_id = v_profile_id
    AND climb_id = p_climb_id;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing ascent
    UPDATE public.ascents
    SET sent = p_sent
    WHERE id = v_existing_id
    RETURNING id INTO v_ascent_id;
  ELSE
    -- Insert new ascent with profile_id and user_id (not competitor_number)
    INSERT INTO public.ascents (
      user_id,
      profile_id,
      competitor_number,
      climb_id,
      sent
    )
    VALUES (
      v_user_id,
      v_profile_id,
      NULL, -- Don't record competitor_number
      p_climb_id,
      p_sent
    )
    RETURNING id INTO v_ascent_id;
  END IF;
  
  RETURN v_ascent_id;
END;
$$;
ALTER FUNCTION "public"."create_anonymous_ascent"("p_competitor_number" bigint, "p_climb_id" "uuid", "p_sent" boolean) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."create_user_profile"("p_user_id" "uuid", "p_comp_cohort" "text" DEFAULT 'inclusive'::"text", "p_is_junior" boolean DEFAULT false, "p_phone_number" "text" DEFAULT NULL::"text", "p_age_category" "text" DEFAULT NULL::"text", "p_name" "text" DEFAULT NULL::"text", "p_profile_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_profile_id uuid;
  v_phone_number text;
  v_profile_name text;
BEGIN
  -- Determine the profile name (prefer p_profile_name, fallback to p_name)
  v_profile_name := COALESCE(p_profile_name, p_name);
  
  -- Validate required fields
  IF v_profile_name IS NULL OR v_profile_name = '' THEN
    RAISE EXCEPTION 'Profile name is required';
  END IF;
  
  IF p_comp_cohort IS NULL THEN
    RAISE EXCEPTION 'Gender cohort is required';
  END IF;

  -- If phone_number not provided and this is not the first profile, get it from the user's first profile
  IF p_phone_number IS NULL OR p_phone_number = '' THEN
    SELECT phone_number INTO v_phone_number
    FROM public.profiles
    WHERE user_id = p_user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- If still no phone number found and this is registration (p_name provided, not p_profile_name), require it
    IF (v_phone_number IS NULL OR v_phone_number = '') AND p_profile_name IS NULL THEN
      RAISE EXCEPTION 'Phone number is required for registration';
    END IF;
  ELSE
    v_phone_number := p_phone_number;
  END IF;

  INSERT INTO public.profiles (
    user_id,
    profile_id,
    username,  -- Store name in username field
    phone_number,
    comp_cohort, 
    age_category,
    is_junior
  )
  VALUES (
    p_user_id,
    gen_random_uuid(),
    v_profile_name,
    COALESCE(v_phone_number, NULL),
    p_comp_cohort, 
    p_age_category,
    p_is_junior
  )
  RETURNING profile_id INTO v_profile_id;
  
  RETURN v_profile_id;
END;
$$;
ALTER FUNCTION "public"."create_user_profile"("p_user_id" "uuid", "p_comp_cohort" "text", "p_is_junior" boolean, "p_phone_number" "text", "p_age_category" "text", "p_name" "text", "p_profile_name" "text") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_climbers_by_send_count"("p_send_count" integer) RETURNS TABLE("profile_id" "uuid", "user_id" "uuid", "username" "text", "phone_number" "text", "comp_cohort" "text", "age_category" "text", "competitor_number" bigint, "send_count" bigint, "email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.profile_id,
    p.user_id,
    p.username,
    p.phone_number,
    p.comp_cohort,
    p.age_category,
    p.competitor_number,
    COUNT(a.id)::bigint as send_count,
    COALESCE(u.email, '')::text as email
  FROM public.profiles p
  LEFT JOIN public.ascents a ON a.profile_id = p.profile_id AND a.sent = true
  LEFT JOIN auth.users u ON u.id = p.user_id
  GROUP BY 
    p.profile_id,
    p.user_id,
    p.username,
    p.phone_number,
    p.comp_cohort,
    p.age_category,
    p.competitor_number,
    u.email
  HAVING COUNT(a.id) >= p_send_count
  ORDER BY p.competitor_number;
END;
$$;
ALTER FUNCTION "public"."get_climbers_by_send_count"("p_send_count" integer) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_profile_by_competitor_number"("p_competitor_number" bigint) RETURNS TABLE("profile_id" "uuid", "user_id" "uuid", "competitor_number" bigint, "comp_cohort" "text", "username" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.profile_id,
    p.user_id,
    p.competitor_number,
    p.comp_cohort,
    p.username
  FROM public.profiles p
  WHERE p.competitor_number = p_competitor_number;
END;
$$;
ALTER FUNCTION "public"."get_profile_by_competitor_number"("p_competitor_number" bigint) OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_user_profiles"("p_user_id" "uuid") RETURNS TABLE("profile_id" "uuid", "competitor_number" bigint, "comp_cohort" "text", "is_junior" boolean, "age_category" "text", "username" "text", "phone_number" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.profile_id,
    p.competitor_number,
    p.comp_cohort,
    p.is_junior,
    p.age_category,
    p.username,
    p.phone_number,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = p_user_id
  ORDER BY p.created_at;
END;
$$;
ALTER FUNCTION "public"."get_user_profiles"("p_user_id" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  );
END;
$$;
ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."is_setter_or_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('setter', 'admin')
  );
END;
$$;
ALTER FUNCTION "public"."is_setter_or_admin"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."leaderboard_stats"("p_competition_id" bigint DEFAULT NULL::bigint) RETURNS TABLE("profile_id" "uuid", "user_id" "uuid", "competitor_number" bigint, "comp_cohort" "text", "age_category" "text", "total_sends" bigint, "total_points" bigint, "pumpfest_sends" bigint, "pumpfest_points" bigint)
    LANGUAGE "sql" STABLE
    AS $$
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
ALTER FUNCTION "public"."leaderboard_stats"("p_competition_id" bigint) OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ascents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "climb_id" "uuid" NOT NULL,
    "sent" boolean DEFAULT false,
    "profile_id" "uuid",
    "competitor_number" bigint,
    CONSTRAINT "ascents_profile_or_competitor_check" CHECK (((("profile_id" IS NOT NULL) AND ("competitor_number" IS NULL)) OR (("profile_id" IS NULL) AND ("competitor_number" IS NOT NULL))))
);
ALTER TABLE "public"."ascents" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."climbs" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "wall" bigint,
    "hold_colour_id" bigint,
    "tag_colour_id" bigint,
    "photo" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sector_tag_id" integer,
    "archived" boolean DEFAULT false NOT NULL,
    "climb_type" "text" NOT NULL,
    "rope_grade" smallint,
    "competition_id" bigint NOT NULL,
    CONSTRAINT "climb_type_valid" CHECK (("climb_type" = ANY (ARRAY['boulder'::"text", 'rope'::"text"]))),
    CONSTRAINT "grade_matches_type" CHECK (((("climb_type" = 'boulder'::"text") AND ("tag_colour_id" IS NOT NULL) AND ("rope_grade" IS NULL)) OR (("climb_type" = 'rope'::"text") AND ("rope_grade" IS NOT NULL) AND ("tag_colour_id" IS NULL))))
);
ALTER TABLE "public"."climbs" OWNER TO "postgres";
COMMENT ON COLUMN "public"."climbs"."archived" IS 'When true, climb can be viewed but not marked as sent.';
CREATE TABLE IF NOT EXISTS "public"."colours" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "hex_code" "text",
    "sort_order" bigint,
    "usage" "text",
    CONSTRAINT "colour_usage_check" CHECK (("usage" = ANY (ARRAY['tag'::"text", 'hold'::"text", 'both'::"text"])))
);
ALTER TABLE "public"."colours" OWNER TO "postgres";
ALTER TABLE "public"."colours" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."colours_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
CREATE TABLE IF NOT EXISTS "public"."competitions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "is_current" boolean DEFAULT false NOT NULL
);
ALTER TABLE "public"."competitions" OWNER TO "postgres";
ALTER TABLE "public"."competitions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."competitions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "feedback" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "phone" "text",
    "is_public_submission" boolean DEFAULT false
);
ALTER TABLE "public"."feedback" OWNER TO "postgres";
COMMENT ON COLUMN "public"."feedback"."is_public_submission" IS 'Flag indicating if this is a public/anonymous submission. Required to be true for anonymous users.';
CREATE TABLE IF NOT EXISTS "public"."gyms" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying
);
ALTER TABLE "public"."gyms" OWNER TO "postgres";
COMMENT ON TABLE "public"."gyms" IS 'climbing gyms in Hobart';
ALTER TABLE "public"."gyms" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."gyms_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "username" "text",
    "role" "text" DEFAULT 'climber'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "comp_cohort" "text",
    "competitor_number" bigint NOT NULL,
    "is_junior" boolean DEFAULT false,
    "phone_number" "text",
    "age_category" "text",
    "profile_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "profiles_age_category_check" CHECK ((("age_category" IS NULL) OR ("age_category" = ANY (ARRAY['u18'::"text", 'adult'::"text", 'masters'::"text"])))),
    CONSTRAINT "profiles_comp_cohort_check" CHECK (("comp_cohort" = ANY (ARRAY['male'::"text", 'female'::"text", 'inclusive'::"text"])))
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";
ALTER TABLE "public"."profiles" ALTER COLUMN "competitor_number" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."profiles_competitor_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
CREATE TABLE IF NOT EXISTS "public"."rope_grades" (
    "id" smallint NOT NULL,
    "sort_order" smallint NOT NULL,
    CONSTRAINT "rope_grades_id_check" CHECK ((("id" >= 12) AND ("id" <= 29)))
);
ALTER TABLE "public"."rope_grades" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."walls" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gym" bigint,
    "name" character varying,
    "wall_type" "text" NOT NULL,
    CONSTRAINT "wall_type_valid" CHECK (("wall_type" = ANY (ARRAY['boulder'::"text", 'rope'::"text"])))
);
ALTER TABLE "public"."walls" OWNER TO "postgres";
ALTER TABLE "public"."walls" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."walls_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
ALTER TABLE ONLY "public"."ascents"
    ADD CONSTRAINT "ascents_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."climbs"
    ADD CONSTRAINT "climbs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."colours"
    ADD CONSTRAINT "colours_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."competitions"
    ADD CONSTRAINT "competitions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_competitor_number_key" UNIQUE ("competitor_number");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("profile_id");
ALTER TABLE ONLY "public"."rope_grades"
    ADD CONSTRAINT "rope_grades_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."rope_grades"
    ADD CONSTRAINT "rope_grades_sort_order_key" UNIQUE ("sort_order");
ALTER TABLE ONLY "public"."walls"
    ADD CONSTRAINT "walls_pkey" PRIMARY KEY ("id");
CREATE INDEX "ascents_climb_id_idx" ON "public"."ascents" USING "btree" ("climb_id");
CREATE UNIQUE INDEX "ascents_competitor_number_climb_id_unique" ON "public"."ascents" USING "btree" ("competitor_number", "climb_id") WHERE (("competitor_number" IS NOT NULL) AND ("profile_id" IS NULL));
CREATE UNIQUE INDEX "ascents_profile_id_climb_id_unique" ON "public"."ascents" USING "btree" ("profile_id", "climb_id") WHERE ("profile_id" IS NOT NULL);
CREATE INDEX "climbs_hold_colour_id_tag_colour_id_wall_idx" ON "public"."climbs" USING "btree" ("hold_colour_id", "tag_colour_id", "wall");
CREATE UNIQUE INDEX "climbs_sector_tag_per_competition" ON "public"."climbs" USING "btree" ("competition_id", "sector_tag_id");
CREATE UNIQUE INDEX "competitions_one_current" ON "public"."competitions" USING "btree" ("is_current") WHERE ("is_current" = true);
CREATE INDEX "idx_ascents_profile_sent" ON "public"."ascents" USING "btree" ("profile_id", "sent") WHERE (("sent" = true) AND ("profile_id" IS NOT NULL));
CREATE INDEX "idx_climbs_rope_grade" ON "public"."climbs" USING "btree" ("rope_grade");
CREATE INDEX "idx_feedback_email" ON "public"."feedback" USING "btree" ("email");
CREATE OR REPLACE TRIGGER "climbs_assign_current_competition" BEFORE INSERT ON "public"."climbs" FOR EACH ROW EXECUTE FUNCTION "public"."climbs_assign_current_competition"();
ALTER TABLE ONLY "public"."ascents"
    ADD CONSTRAINT "ascents_climb_id_fkey" FOREIGN KEY ("climb_id") REFERENCES "public"."climbs"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ascents"
    ADD CONSTRAINT "ascents_competitor_number_fkey" FOREIGN KEY ("competitor_number") REFERENCES "public"."profiles"("competitor_number") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ascents"
    ADD CONSTRAINT "ascents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("profile_id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ascents"
    ADD CONSTRAINT "ascents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ascents"
    ADD CONSTRAINT "ascents_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."climbs"
    ADD CONSTRAINT "climbs_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id");
ALTER TABLE ONLY "public"."climbs"
    ADD CONSTRAINT "climbs_hold_colour_fk" FOREIGN KEY ("hold_colour_id") REFERENCES "public"."colours"("id");
ALTER TABLE ONLY "public"."climbs"
    ADD CONSTRAINT "climbs_rope_grade_fkey" FOREIGN KEY ("rope_grade") REFERENCES "public"."rope_grades"("id");
ALTER TABLE ONLY "public"."climbs"
    ADD CONSTRAINT "climbs_tag_colour_fk" FOREIGN KEY ("tag_colour_id") REFERENCES "public"."colours"("id");
ALTER TABLE ONLY "public"."climbs"
    ADD CONSTRAINT "climbs_wall_fkey" FOREIGN KEY ("wall") REFERENCES "public"."walls"("id");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."walls"
    ADD CONSTRAINT "walls_gym_fkey" FOREIGN KEY ("gym") REFERENCES "public"."gyms"("id");
CREATE POLICY "Admins can delete any profile" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."user_id" = "auth"."uid"()) AND ("profiles_1"."role" = 'admin'::"text")))));
CREATE POLICY "Admins can insert any profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."user_id" = "auth"."uid"()) AND ("profiles_1"."role" = 'admin'::"text")))));
CREATE POLICY "Admins can update any profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());
CREATE POLICY "Anyone can create ascents by competitor_number" ON "public"."ascents" FOR INSERT TO "authenticated", "anon" WITH CHECK (((("competitor_number" IS NOT NULL) AND ("profile_id" IS NULL)) OR (("profile_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."profile_id" = "ascents"."profile_id") AND ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))));
CREATE POLICY "Authenticated users can read feedback" ON "public"."feedback" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can view all ascents" ON "public"."ascents" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Authenticated users can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."climbs" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."colours" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."gyms" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."walls" FOR SELECT USING (true);
CREATE POLICY "Enable users to view their own data only" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));
CREATE POLICY "Setters and admins can update climbs" ON "public"."climbs" FOR UPDATE TO "authenticated" USING ("public"."is_setter_or_admin"()) WITH CHECK ("public"."is_setter_or_admin"());
CREATE POLICY "Users can create ascents for their profiles" ON "public"."ascents" FOR INSERT TO "authenticated" WITH CHECK ((("profile_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."profile_id" = "ascents"."profile_id") AND ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));
CREATE POLICY "Users can delete ascents for their profiles" ON "public"."ascents" FOR DELETE TO "authenticated" USING ((("profile_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."profile_id" = "ascents"."profile_id") AND ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));
CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can update ascents for their profiles" ON "public"."ascents" FOR UPDATE TO "authenticated" USING ((("profile_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."profile_id" = "ascents"."profile_id") AND ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))))) WITH CHECK ((("profile_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."profile_id" = "ascents"."profile_id") AND ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));
CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can view ascents for their profiles" ON "public"."ascents" FOR SELECT TO "authenticated" USING ((("profile_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."profile_id" = "ascents"."profile_id") AND ("profiles"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));
CREATE POLICY "Users can view other profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users insert own ascents" ON "public"."ascents" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "Users manage own ascents" ON "public"."ascents" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "Users read own ascents" ON "public"."ascents" FOR SELECT USING (("user_id" = "auth"."uid"()));
CREATE POLICY "admins can delete climbs" ON "public"."climbs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));
CREATE POLICY "allow_read_all" ON "public"."rope_grades" FOR SELECT USING (true);
ALTER TABLE "public"."ascents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."climbs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."colours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."competitions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitions_all_admin" ON "public"."competitions" USING ("public"."is_admin"());
CREATE POLICY "competitions_select_all" ON "public"."competitions" FOR SELECT USING (true);
ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_insert_authenticated" ON "public"."feedback" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "feedback_insert_public" ON "public"."feedback" FOR INSERT TO "anon" WITH CHECK ((("is_public_submission" IS TRUE) AND ("char_length"(COALESCE("feedback", ''::"text")) <= 2000)));
ALTER TABLE "public"."gyms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rope_grades" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setters can insert climbs" ON "public"."climbs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['setter'::"text", 'admin'::"text"]))))));
ALTER TABLE "public"."walls" ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON FUNCTION "public"."climbs_assign_current_competition"() TO "anon";
GRANT ALL ON FUNCTION "public"."climbs_assign_current_competition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."climbs_assign_current_competition"() TO "service_role";
GRANT ALL ON FUNCTION "public"."create_anonymous_ascent"("p_competitor_number" bigint, "p_climb_id" "uuid", "p_sent" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_anonymous_ascent"("p_competitor_number" bigint, "p_climb_id" "uuid", "p_sent" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_anonymous_ascent"("p_competitor_number" bigint, "p_climb_id" "uuid", "p_sent" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."create_user_profile"("p_user_id" "uuid", "p_comp_cohort" "text", "p_is_junior" boolean, "p_phone_number" "text", "p_age_category" "text", "p_name" "text", "p_profile_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"("p_user_id" "uuid", "p_comp_cohort" "text", "p_is_junior" boolean, "p_phone_number" "text", "p_age_category" "text", "p_name" "text", "p_profile_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"("p_user_id" "uuid", "p_comp_cohort" "text", "p_is_junior" boolean, "p_phone_number" "text", "p_age_category" "text", "p_name" "text", "p_profile_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_climbers_by_send_count"("p_send_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_climbers_by_send_count"("p_send_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_climbers_by_send_count"("p_send_count" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_profile_by_competitor_number"("p_competitor_number" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_profile_by_competitor_number"("p_competitor_number" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_by_competitor_number"("p_competitor_number" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_profiles"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profiles"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profiles"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_setter_or_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_setter_or_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_setter_or_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."leaderboard_stats"("p_competition_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."leaderboard_stats"("p_competition_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."leaderboard_stats"("p_competition_id" bigint) TO "service_role";
GRANT ALL ON TABLE "public"."ascents" TO "anon";
GRANT ALL ON TABLE "public"."ascents" TO "authenticated";
GRANT ALL ON TABLE "public"."ascents" TO "service_role";
GRANT ALL ON TABLE "public"."climbs" TO "anon";
GRANT ALL ON TABLE "public"."climbs" TO "authenticated";
GRANT ALL ON TABLE "public"."climbs" TO "service_role";
GRANT ALL ON TABLE "public"."colours" TO "anon";
GRANT ALL ON TABLE "public"."colours" TO "authenticated";
GRANT ALL ON TABLE "public"."colours" TO "service_role";
GRANT ALL ON SEQUENCE "public"."colours_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."colours_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."colours_id_seq" TO "service_role";
GRANT ALL ON TABLE "public"."competitions" TO "anon";
GRANT ALL ON TABLE "public"."competitions" TO "authenticated";
GRANT ALL ON TABLE "public"."competitions" TO "service_role";
GRANT ALL ON SEQUENCE "public"."competitions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."competitions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."competitions_id_seq" TO "service_role";
GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";
GRANT ALL ON TABLE "public"."gyms" TO "anon";
GRANT ALL ON TABLE "public"."gyms" TO "authenticated";
GRANT ALL ON TABLE "public"."gyms" TO "service_role";
GRANT ALL ON SEQUENCE "public"."gyms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."gyms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."gyms_id_seq" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON SEQUENCE "public"."profiles_competitor_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."profiles_competitor_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."profiles_competitor_number_seq" TO "service_role";
GRANT ALL ON TABLE "public"."rope_grades" TO "anon";
GRANT ALL ON TABLE "public"."rope_grades" TO "authenticated";
GRANT ALL ON TABLE "public"."rope_grades" TO "service_role";
GRANT ALL ON TABLE "public"."walls" TO "anon";
GRANT ALL ON TABLE "public"."walls" TO "authenticated";
GRANT ALL ON TABLE "public"."walls" TO "service_role";
GRANT ALL ON SEQUENCE "public"."walls_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."walls_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."walls_id_seq" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

-- ============================================================
-- Storage bucket policies
-- ============================================================

create policy "Anyone can view climb images"
  on "storage"."objects"
  as permissive
  for select
  to public
  using ((bucket_id = 'climbs'::text));

create policy "Only setters and admins can upload climb images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
  with check (((bucket_id = 'climbs'::text) AND ((storage.foldername(name))[1] = 'climb-images'::text) AND public.is_setter_or_admin()));

create policy "Setters and admins can delete climb images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
  using (((bucket_id = 'climbs'::text) AND public.is_setter_or_admin()));

create policy "Setters and admins can update climb images"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
  using (((bucket_id = 'climbs'::text) AND public.is_setter_or_admin()));

-- ============================================================
-- Reference data
-- ============================================================




-- Data for Name: colours; Type: TABLE DATA; Schema: public; Owner: postgres

INSERT INTO "public"."colours" ("id", "created_at", "name", "hex_code", "sort_order", "usage") VALUES
	(8, '2025-12-14 12:20:57.726293+00', 'Wild Card', NULL, NULL, 'tag'),
	(1, '2025-12-14 12:20:57.726293+00', 'Green', '#008000', 1, 'both'),
	(2, '2025-12-14 12:20:57.726293+00', 'Blue', '#0000FF', 2, 'both'),
	(3, '2025-12-14 12:20:57.726293+00', 'Purple', '#800080', 3, 'both'),
	(4, '2025-12-14 12:20:57.726293+00', 'Red', '#FF0000', 4, 'both'),
	(5, '2025-12-14 12:20:57.726293+00', 'Yellow', '#FFD700', 5, 'both'),
	(7, '2025-12-14 12:20:57.726293+00', 'White', '#FFFFFF', 7, 'both'),
	(9, '2025-12-14 12:20:57.726293+00', 'Teal', '#008080', NULL, 'hold'),
	(10, '2025-12-14 12:20:57.726293+00', 'Lime', '#32CD32', NULL, 'hold'),
	(11, '2025-12-14 12:20:57.726293+00', 'Dark Green', '#006400', NULL, 'hold'),
	(12, '2025-12-14 12:20:57.726293+00', 'Pink', '#FF69B4', NULL, 'hold'),
	(6, '2025-12-14 12:20:57.726293+00', 'Black', '#000000', 6, 'both'),
	(13, '2026-01-09 05:48:05.165554+00', 'Orange', NULL, NULL, 'hold'),
	(14, '2026-01-21 23:18:32.461455+00', 'Grey', NULL, NULL, 'hold');


-- Data for Name: competitions; Type: TABLE DATA; Schema: public; Owner: postgres

INSERT INTO "public"."competitions" ("id", "created_at", "name", "is_current") VALUES
	(1, '2026-05-01 11:55:12.936421+00', 'Summer Sector Series ''26', false),
	(2, '2026-05-01 11:55:12.936421+00', 'Rock It Rope Series ''26', true);


-- Data for Name: gyms; Type: TABLE DATA; Schema: public; Owner: postgres

INSERT INTO "public"."gyms" ("id", "created_at", "name") VALUES
	(1, '2025-12-12 11:43:23.288281+00', 'Hobart'),
	(2, '2025-12-12 11:43:34.613422+00', 'Derwent Park');


-- Data for Name: rope_grades; Type: TABLE DATA; Schema: public; Owner: postgres

INSERT INTO "public"."rope_grades" ("id", "sort_order") VALUES
	(12, 12),
	(13, 13),
	(14, 14),
	(15, 15),
	(16, 16),
	(17, 17),
	(18, 18),
	(19, 19),
	(20, 20),
	(21, 21),
	(22, 22),
	(23, 23),
	(24, 24),
	(25, 25),
	(26, 26),
	(27, 27),
	(28, 28),
	(29, 29);


-- Data for Name: walls; Type: TABLE DATA; Schema: public; Owner: postgres

INSERT INTO "public"."walls" ("id", "created_at", "gym", "name", "wall_type") VALUES
	(1, '2025-12-14 11:56:12.56923+00', 1, 'Nook', 'boulder'),
	(2, '2025-12-15 12:43:08.239106+00', 2, 'Fairywren', 'boulder'),
	(3, '2025-12-20 12:20:40.417164+00', 1, 'Slabby', 'boulder'),
	(4, '2025-12-20 12:32:20.332392+00', 1, 'Back Wall', 'boulder'),
	(5, '2025-12-20 12:32:20.332392+00', 1, 'Roof', 'boulder'),
	(6, '2025-12-20 12:32:20.332392+00', 1, 'Slabby', 'boulder'),
	(7, '2025-12-20 12:32:20.332392+00', 1, 'V-Wall', 'boulder'),
	(8, '2025-12-20 12:32:20.332392+00', 1, 'Steep', 'boulder'),
	(9, '2025-12-20 12:32:20.332392+00', 2, 'Wedgey', 'boulder'),
	(10, '2025-12-20 12:32:20.332392+00', 2, 'Turbo Chook & Pardalote', 'boulder'),
	(11, '2025-12-20 12:32:20.332392+00', 2, 'Maria Island', 'boulder'),
	(12, '2025-12-20 12:32:20.332392+00', 2, 'Bruny Island', 'boulder'),
	(13, '2025-12-20 12:32:20.332392+00', 2, 'Currawong', 'boulder'),
	(14, '2026-02-14 03:41:42.281267+00', 2, 'Pumpfest', 'boulder'),
	(15, '2026-05-01 11:55:12.656682+00', 1, 'Top-rope room', 'rope'),
	(16, '2026-05-01 11:55:12.656682+00', 1, 'Lift well', 'rope'),
	(17, '2026-05-01 11:55:12.656682+00', 1, 'Steep lead', 'rope'),
	(18, '2026-05-01 11:55:12.656682+00', 1, 'Flat lead', 'rope'),
	(19, '2026-05-01 11:55:12.656682+00', 1, 'Roof lead', 'rope');


-- Name: colours_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres

SELECT pg_catalog.setval('"public"."colours_id_seq"', 14, true);


-- Name: competitions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres

SELECT pg_catalog.setval('"public"."competitions_id_seq"', 2, true);


-- Name: gyms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres

SELECT pg_catalog.setval('"public"."gyms_id_seq"', 2, true);


-- Name: walls_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres

SELECT pg_catalog.setval('"public"."walls_id_seq"', 19, true);




