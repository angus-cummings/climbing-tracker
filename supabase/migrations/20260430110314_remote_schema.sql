drop extension if exists "pg_net";

drop policy "Anyone can create ascents by competitor_number" on "public"."ascents";

drop policy "Users can create ascents for their profiles" on "public"."ascents";

drop policy "Users can delete ascents for their profiles" on "public"."ascents";

drop policy "Users can update ascents for their profiles" on "public"."ascents";

drop policy "Users can view ascents for their profiles" on "public"."ascents";

drop policy "Setters and admins can update climbs" on "public"."climbs";

drop policy "admins can delete climbs" on "public"."climbs";

drop policy "setters can insert climbs" on "public"."climbs";

drop policy "Admins can delete any profile" on "public"."profiles";

drop policy "Admins can insert any profile" on "public"."profiles";

drop policy "Admins can update any profile" on "public"."profiles";

drop policy "Admins can view all profiles" on "public"."profiles";

alter table "public"."ascents" drop constraint "ascents_climb_id_fkey";

alter table "public"."ascents" drop constraint "ascents_competitor_number_fkey";

alter table "public"."ascents" drop constraint "ascents_profile_id_fkey";

alter table "public"."climbs" drop constraint "climbs_hold_colour_fk";

alter table "public"."climbs" drop constraint "climbs_tag_colour_fk";

alter table "public"."climbs" drop constraint "climbs_wall_fkey";

alter table "public"."walls" drop constraint "walls_gym_fkey";

alter table "public"."ascents" add constraint "ascents_climb_id_fkey" FOREIGN KEY (climb_id) REFERENCES public.climbs(id) ON DELETE CASCADE not valid;

alter table "public"."ascents" validate constraint "ascents_climb_id_fkey";

alter table "public"."ascents" add constraint "ascents_competitor_number_fkey" FOREIGN KEY (competitor_number) REFERENCES public.profiles(competitor_number) ON DELETE CASCADE not valid;

alter table "public"."ascents" validate constraint "ascents_competitor_number_fkey";

alter table "public"."ascents" add constraint "ascents_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(profile_id) ON DELETE CASCADE not valid;

alter table "public"."ascents" validate constraint "ascents_profile_id_fkey";

alter table "public"."climbs" add constraint "climbs_hold_colour_fk" FOREIGN KEY (hold_colour_id) REFERENCES public.colours(id) not valid;

alter table "public"."climbs" validate constraint "climbs_hold_colour_fk";

alter table "public"."climbs" add constraint "climbs_tag_colour_fk" FOREIGN KEY (tag_colour_id) REFERENCES public.colours(id) not valid;

alter table "public"."climbs" validate constraint "climbs_tag_colour_fk";

alter table "public"."climbs" add constraint "climbs_wall_fkey" FOREIGN KEY (wall) REFERENCES public.walls(id) not valid;

alter table "public"."climbs" validate constraint "climbs_wall_fkey";

alter table "public"."walls" add constraint "walls_gym_fkey" FOREIGN KEY (gym) REFERENCES public.gyms(id) not valid;

alter table "public"."walls" validate constraint "walls_gym_fkey";

create or replace view "public"."leaderboard_stats" as  SELECT p.profile_id,
    p.user_id,
    p.competitor_number,
    p.comp_cohort,
    p.age_category,
    count(a.id) FILTER (WHERE (a.sent = true)) AS total_sends,
    COALESCE(sum(
        CASE
            WHEN (a.sent = true) THEN
            CASE
                WHEN (lower((w.name)::text) = 'pumpfest'::text) THEN 2
                ELSE 1
            END
            ELSE 0
        END), (0)::bigint) AS total_points,
    count(a.id) FILTER (WHERE ((a.sent = true) AND (lower((w.name)::text) = 'pumpfest'::text))) AS pumpfest_sends,
    COALESCE(sum(
        CASE
            WHEN ((a.sent = true) AND (lower((w.name)::text) = 'pumpfest'::text)) THEN 2
            ELSE 0
        END), (0)::bigint) AS pumpfest_points
   FROM (((public.profiles p
     LEFT JOIN public.ascents a ON ((a.profile_id = p.profile_id)))
     LEFT JOIN public.climbs c ON ((c.id = a.climb_id)))
     LEFT JOIN public.walls w ON ((w.id = c.wall)))
  GROUP BY p.profile_id, p.user_id, p.competitor_number, p.comp_cohort, p.age_category;



  create policy "Anyone can create ascents by competitor_number"
  on "public"."ascents"
  as permissive
  for insert
  to anon, authenticated
with check ((((competitor_number IS NOT NULL) AND (profile_id IS NULL)) OR ((profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.profile_id = ascents.profile_id) AND (profiles.user_id = ( SELECT auth.uid() AS uid))))))));



  create policy "Users can create ascents for their profiles"
  on "public"."ascents"
  as permissive
  for insert
  to authenticated
with check (((profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.profile_id = ascents.profile_id) AND (profiles.user_id = ( SELECT auth.uid() AS uid)))))));



  create policy "Users can delete ascents for their profiles"
  on "public"."ascents"
  as permissive
  for delete
  to authenticated
using (((profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.profile_id = ascents.profile_id) AND (profiles.user_id = ( SELECT auth.uid() AS uid)))))));



  create policy "Users can update ascents for their profiles"
  on "public"."ascents"
  as permissive
  for update
  to authenticated
using (((profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.profile_id = ascents.profile_id) AND (profiles.user_id = ( SELECT auth.uid() AS uid)))))))
with check (((profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.profile_id = ascents.profile_id) AND (profiles.user_id = ( SELECT auth.uid() AS uid)))))));



  create policy "Users can view ascents for their profiles"
  on "public"."ascents"
  as permissive
  for select
  to authenticated
using (((profile_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.profile_id = ascents.profile_id) AND (profiles.user_id = ( SELECT auth.uid() AS uid)))))));



  create policy "Setters and admins can update climbs"
  on "public"."climbs"
  as permissive
  for update
  to authenticated
using (public.is_setter_or_admin())
with check (public.is_setter_or_admin());



  create policy "admins can delete climbs"
  on "public"."climbs"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'admin'::text)))));



  create policy "setters can insert climbs"
  on "public"."climbs"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['setter'::text, 'admin'::text]))))));



  create policy "Admins can delete any profile"
  on "public"."profiles"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.user_id = auth.uid()) AND (profiles_1.role = 'admin'::text)))));



  create policy "Admins can insert any profile"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.user_id = auth.uid()) AND (profiles_1.role = 'admin'::text)))));



  create policy "Admins can update any profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using (public.is_admin())
with check (public.is_admin());



  create policy "Admins can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (public.is_admin());



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



