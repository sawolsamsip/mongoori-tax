"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
  children?: React.ReactNode;
}

/**
 * Fetches link token from our API, then opens Plaid Link. On success, exchanges token via API and refetches.
 */
export function PlaidLinkButton({ onSuccess, children }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/plaid/link-token", { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.link_token) setLinkToken(data.link_token);
      } catch {
        if (!cancelled) setLinkToken(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSuccess = useCallback(
    async (publicToken: string) => {
      setLoading(true);
      try {
        const res = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken }),
        });
        if (res.ok) onSuccess?.();
      } finally {
        setLoading(false);
      }
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
  });

  return (
    <button
      type="button"
      onClick={() => open()}
      disabled={!ready || loading}
      className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
    >
      {loading ? "Connecting…" : children ?? "Connect bank account"}
    </button>
  );
}
