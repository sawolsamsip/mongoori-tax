import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for browser (auth + data).
 * Use in Client Components and for client-side auth.
 * During build when env is missing, returns a proxy that throws on use so static export can succeed.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get() {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
      },
    });
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
