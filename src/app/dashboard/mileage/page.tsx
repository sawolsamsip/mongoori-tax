import { MileageCalculator } from "@/components/MileageCalculator";
import Link from "next/link";

export default function MileagePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Mileage Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            IRS standard mileage deduction — 2026 rate: $0.725/mile (Schedule C, Line 9)
          </p>
        </div>
      </div>
      <MileageCalculator />
    </div>
  );
}
