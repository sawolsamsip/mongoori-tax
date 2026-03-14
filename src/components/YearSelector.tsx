"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const YEARS = [2024, 2025, 2026] as const;

interface Props {
  current: number;
}

export function YearSelector({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(year: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(year));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
      {YEARS.map((y) => (
        <button
          key={y}
          onClick={() => handleChange(y)}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
            y === current
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}
