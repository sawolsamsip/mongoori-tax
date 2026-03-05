"use client";

import { useState } from "react";

export function SyncButton({ plaidItemId }: { plaidItemId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    try {
      const res = await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaid_item_id: plaidItemId }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={loading}
      className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
    >
      {loading ? "Syncing…" : "Sync"}
    </button>
  );
}
