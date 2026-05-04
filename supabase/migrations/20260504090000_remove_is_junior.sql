-- Remove is_junior field: it was never used meaningfully beyond a checkbox with helper text.

-- Drop the old function signatures that include p_is_junior
DROP FUNCTION IF EXISTS "public"."create_user_profile"("p_user_id" "uuid", "p_comp_cohort" "text", "p_is_junior" boolean, "p_phone_number" "text", "p_age_category" "text", "p_name" "text", "p_profile_name" "text");

CREATE OR REPLACE FUNCTION "public"."create_user_profile"("p_user_id" "uuid", "p_comp_cohort" "text" DEFAULT 'inclusive'::"text", "p_phone_number" "text" DEFAULT NULL::"text", "p_age_category" "text" DEFAULT NULL::"text", "p_name" "text" DEFAULT NULL::"text", "p_profile_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
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
    username,
    phone_number,
    comp_cohort,
    age_category
  )
  VALUES (
    p_user_id,
    gen_random_uuid(),
    v_profile_name,
    COALESCE(v_phone_number, NULL),
    p_comp_cohort,
    p_age_category
  )
  RETURNING profile_id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;

ALTER FUNCTION "public"."create_user_profile"("p_user_id" "uuid", "p_comp_cohort" "text", "p_phone_number" "text", "p_age_category" "text", "p_name" "text", "p_profile_name" "text") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."create_user_profile"("p_user_id" "uuid", "p_comp_cohort" "text", "p_phone_number" "text", "p_age_category" "text", "p_name" "text", "p_profile_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"("p_user_id" "uuid", "p_comp_cohort" "text", "p_phone_number" "text", "p_age_category" "text", "p_name" "text", "p_profile_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"("p_user_id" "uuid", "p_comp_cohort" "text", "p_phone_number" "text", "p_age_category" "text", "p_name" "text", "p_profile_name" "text") TO "service_role";

-- Replace get_user_profiles to remove is_junior from the return type
DROP FUNCTION IF EXISTS "public"."get_user_profiles"("p_user_id" "uuid");

CREATE OR REPLACE FUNCTION "public"."get_user_profiles"("p_user_id" "uuid") RETURNS TABLE("profile_id" "uuid", "competitor_number" bigint, "comp_cohort" "text", "age_category" "text", "username" "text", "phone_number" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.profile_id,
    p.competitor_number,
    p.comp_cohort,
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

-- Drop the column last (after functions are updated)
ALTER TABLE "public"."profiles" DROP COLUMN "is_junior";
