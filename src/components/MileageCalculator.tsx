"use client";

/**
 * Mileage Deduction Calculator — client component.
 * Lets rideshare drivers log miles and see IRS standard mileage deduction.
 * 2026 IRS rate: $0.725/mile (Line 9, Schedule C).
 */

import { useState, useEffect, useCallback } from "react";

// 2026 IRS standard mileage rate for business
const IRS_RATE_2026 = 0.725;

interface MileageLog {
  id: string;
  date: string;
  miles: number;
  purpose: string | null;
}

export function MileageCalculator() {
  const [logs, setLogs] = useState<MileageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [miles, setMiles] = useState("");
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/mileage");
    if (res.ok) {
      const json = await res.json() as { logs: MileageLog[] };
      setLogs(json.logs);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalMiles = logs.reduce((s, l) => s + Number(l.miles), 0);
  const totalDeduction = totalMiles * IRS_RATE_2026;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const m = parseFloat(miles);
    if (!m || m <= 0) {
      setError("Enter a valid mileage (> 0).");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/mileage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, miles: m, purpose: purpose || undefined }),
    });
    if (res.ok) {
      setMiles("");
      setPurpose("");
      await fetchLogs();
    } else {
      const json = await res.json() as { error?: string };
      setError(json.error ?? "Failed to save.");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/mileage?id=${id}`, { method: "DELETE" });
    if (res.ok) await fetchLogs();
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total miles (YTD)</p>
          <p className="mt-1 text-2xl font-bold">{totalMiles.toLocaleString("en-US")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">IRS rate (2026)</p>
          <p className="mt-1 text-2xl font-bold">${IRS_RATE_2026}/mile</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Mileage deduction (Line 9)</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
              totalDeduction
            )}
          </p>
        </div>
      </div>

      {/* Add entry form */}
      <form
        onSubmit={handleAdd}
        className="rounded-lg border border-border bg-card p-4 space-y-3"
      >
        <h3 className="font-medium text-sm">Log miles</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Miles</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              placeholder="e.g. 42.5"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Purpose (optional)</label>
            <input
              type="text"
              placeholder="e.g. Uber driving"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add entry"}
        </button>
      </form>

      {/* Log table */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          No mileage entries yet. Add your first trip above.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-right font-medium">Miles</th>
                <th className="px-4 py-2 text-right font-medium">Deduction</th>
                <th className="px-4 py-2 text-left font-medium">Purpose</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-2 text-muted-foreground">{l.date}</td>
                  <td className="px-4 py-2 text-right">{Number(l.miles).toFixed(1)}</td>
                  <td className="px-4 py-2 text-right text-green-600">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                      Number(l.miles) * IRS_RATE_2026
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{l.purpose ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
