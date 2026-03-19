import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect("/dashboard");
    }
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/30">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">Tax</h1>
        <p className="mt-2 text-muted-foreground">
          AI bookkeeping & tax prep for US freelancers. Connect your bank, categorize expenses, and get tax-ready reports.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Sign up
          </Link>
        </div>
      </div>
      <p className="mt-10 max-w-md text-center text-xs text-muted-foreground/70 px-4">
        For informational purposes only. mongoori Tax is not a licensed tax preparation service and does not provide professional tax advice. Consult a licensed CPA or tax professional for your specific tax situation.
      </p>
    </div>
  );
}
