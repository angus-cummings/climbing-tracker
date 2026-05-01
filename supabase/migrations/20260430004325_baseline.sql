


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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

SET default_tablespace = '';

SET default_table_access_method = "heap";


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
    "archived" boolean DEFAULT false NOT NULL
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


CREATE TABLE IF NOT EXISTS "public"."walls" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gym" bigint,
    "name" character varying
);


ALTER TABLE "public"."walls" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."leaderboard_stats" WITH ("security_invoker"='on') AS
 SELECT "p"."profile_id",
    "p"."user_id",
    "p"."competitor_number",
    "p"."comp_cohort",
    "p"."age_category",
    "count"("a"."id") FILTER (WHERE ("a"."sent" = true)) AS "total_sends",
    COALESCE("sum"(
        CASE
            WHEN ("a"."sent" = true) THEN
            CASE
                WHEN ("lower"(("w"."name")::"text") = 'pumpfest'::"text") THEN 2
                ELSE 1
            END
            ELSE 0
        END), (0)::bigint) AS "total_points",
    "count"("a"."id") FILTER (WHERE (("a"."sent" = true) AND ("lower"(("w"."name")::"text") = 'pumpfest'::"text"))) AS "pumpfest_sends",
    COALESCE("sum"(
        CASE
            WHEN (("a"."sent" = true) AND ("lower"(("w"."name")::"text") = 'pumpfest'::"text")) THEN 2
            ELSE 0
        END), (0)::bigint) AS "pumpfest_points"
   FROM ((("public"."profiles" "p"
     LEFT JOIN "public"."ascents" "a" ON (("a"."profile_id" = "p"."profile_id")))
     LEFT JOIN "public"."climbs" "c" ON (("c"."id" = "a"."climb_id")))
     LEFT JOIN "public"."walls" "w" ON (("w"."id" = "c"."wall")))
  GROUP BY "p"."profile_id", "p"."user_id", "p"."competitor_number", "p"."comp_cohort", "p"."age_category";


ALTER VIEW "public"."leaderboard_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."leaderboard_stats" IS 'Aggregates send and point totals by profile. Climbs on the pumpfest wall count for 2 points.';



ALTER TABLE "public"."profiles" ALTER COLUMN "competitor_number" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."profiles_competitor_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



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



ALTER TABLE ONLY "public"."climbs"
    ADD CONSTRAINT "climbs_sector_tag_id_key" UNIQUE ("sector_tag_id");



ALTER TABLE ONLY "public"."colours"
    ADD CONSTRAINT "colours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_competitor_number_key" UNIQUE ("competitor_number");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("profile_id");



ALTER TABLE ONLY "public"."walls"
    ADD CONSTRAINT "walls_pkey" PRIMARY KEY ("id");



CREATE INDEX "ascents_climb_id_idx" ON "public"."ascents" USING "btree" ("climb_id");



CREATE UNIQUE INDEX "ascents_competitor_number_climb_id_unique" ON "public"."ascents" USING "btree" ("competitor_number", "climb_id") WHERE (("competitor_number" IS NOT NULL) AND ("profile_id" IS NULL));



CREATE UNIQUE INDEX "ascents_profile_id_climb_id_unique" ON "public"."ascents" USING "btree" ("profile_id", "climb_id") WHERE ("profile_id" IS NOT NULL);



CREATE INDEX "climbs_hold_colour_id_tag_colour_id_wall_idx" ON "public"."climbs" USING "btree" ("hold_colour_id", "tag_colour_id", "wall");



CREATE INDEX "idx_ascents_profile_sent" ON "public"."ascents" USING "btree" ("profile_id", "sent") WHERE (("sent" = true) AND ("profile_id" IS NOT NULL));



CREATE INDEX "idx_feedback_email" ON "public"."feedback" USING "btree" ("email");



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
    ADD CONSTRAINT "climbs_hold_colour_fk" FOREIGN KEY ("hold_colour_id") REFERENCES "public"."colours"("id");



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



ALTER TABLE "public"."ascents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."climbs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."colours" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_insert_authenticated" ON "public"."feedback" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "feedback_insert_public" ON "public"."feedback" FOR INSERT TO "anon" WITH CHECK ((("is_public_submission" IS TRUE) AND ("char_length"(COALESCE("feedback", ''::"text")) <= 2000)));



ALTER TABLE "public"."gyms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "setters can insert climbs" ON "public"."climbs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['setter'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."walls" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";















































































































































































































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



GRANT ALL ON TABLE "public"."walls" TO "anon";
GRANT ALL ON TABLE "public"."walls" TO "authenticated";
GRANT ALL ON TABLE "public"."walls" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboard_stats" TO "anon";
GRANT ALL ON TABLE "public"."leaderboard_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboard_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."profiles_competitor_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."profiles_competitor_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."profiles_competitor_number_seq" TO "service_role";



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































