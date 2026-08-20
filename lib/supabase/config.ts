const fallbackUrl = "https://flramzksucuxlamjjlfu.supabase.co";
const fallbackPublishableKey = "sb_publishable_h0ujPK8igHBJOAAEjSVRAw_wT1_jE1R";

export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl,
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey,
  };
}
