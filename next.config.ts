import type { NextConfig } from "next";

// Allow Next.js Image to optimize Supabase Storage URLs (reduces Supabase cached egress)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const nextConfig: NextConfig = {
  images: {
    ...(supabaseHost && {
      remotePatterns: [
        {
          protocol: "https",
          hostname: supabaseHost,
          pathname: "/storage/v1/object/public/**",
        },
      ],
    }),
  },
};

export default nextConfig;
