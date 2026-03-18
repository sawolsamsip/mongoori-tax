import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for browser (auth + data).
 * Use in Client Components and for client-side auth.
 * When env vars are missing, returns a stub that surfaces a user-friendly error
 * instead of crashing with "Load failed".
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const unavailable = { message: "Service temporarily unavailable. Please try again later." };
    return {
      auth: {
        signUp: async () => ({ data: null, error: unavailable }),
        signInWithPassword: async () => ({ data: null, error: unavailable }),
        signOut: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    } as unknown as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
