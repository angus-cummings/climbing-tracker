// -----------------------------
// 2. Supabase client
// -----------------------------
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  //process.env.VITE_NEXT_PUBLIC_SUPABASE_URL!,
  "https://hrkukqgdfkgxyvinzkqe.supabase.co",
  "sb_publishable_ZOh4HeiBgHJf4BB3WYeqWw_4bnifiBc"
)
