/**
 * IRS Schedule C deduction categories for rideshare drivers.
 * Maps Plaid transaction categories to Schedule C line items.
 */

export const SCHEDULE_C_CATEGORIES = [
  { value: "Vehicle", label: "Vehicle Expenses", line: "Line 9", color: "bg-blue-100 text-blue-800" },
  { value: "Phone", label: "Phone & Internet", line: "Line 25", color: "bg-purple-100 text-purple-800" },
  { value: "Insurance", label: "Insurance", line: "Line 15", color: "bg-green-100 text-green-800" },
  { value: "Meals", label: "Meals (50%)", line: "Line 24b", color: "bg-orange-100 text-orange-800" },
  { value: "Professional Fees", label: "Professional Fees", line: "Line 17", color: "bg-pink-100 text-pink-800" },
  { value: "Other", label: "Other Expenses", line: "Line 48", color: "bg-gray-100 text-gray-700" },
] as const;

export type ScheduleCCategory = (typeof SCHEDULE_C_CATEGORIES)[number]["value"];

export const CATEGORY_MAP: Record<string, ScheduleCCategory> = {
  // Vehicle / Gas / Auto
  "Gas Stations": "Vehicle",
  "Service Stations": "Vehicle",
  "Auto Service": "Vehicle",
  "Automotive": "Vehicle",
  "Car Wash and Auto Detailing": "Vehicle",
  "Parking": "Vehicle",
  "Tolls and Fees": "Vehicle",
  "Uber": "Vehicle",
  "Lyft": "Vehicle",

  // Phone / Internet
  "Phone": "Phone",
  "Telecommunication Services": "Phone",
  "Cable": "Phone",
  "Internet Services": "Phone",

  // Insurance
  "Insurance": "Insurance",
  "Life Insurance": "Insurance",
  "Auto Insurance": "Insurance",
  "Health Insurance": "Insurance",

  // Meals
  "Restaurants": "Meals",
  "Fast Food": "Meals",
  "Coffee Shop": "Meals",
  "Food and Drink": "Meals",

  // Professional Fees
  "Accountants": "Professional Fees",
  "Lawyers": "Professional Fees",
  "Financial Planning and Investments": "Professional Fees",
  "Business Services": "Professional Fees",
};

/**
 * Auto-classify a transaction based on its Plaid category array.
 * Returns null if no mapping found.
 */
export function autoClassify(plaidCategories: string[] | null): ScheduleCCategory | null {
  if (!plaidCategories) return null;
  for (const cat of plaidCategories) {
    if (cat in CATEGORY_MAP) return CATEGORY_MAP[cat];
  }
  return null;
}

/**
 * Resolve effective IRS category: manual override > auto-classify.
 */
export function effectiveCategory(
  deductionType: string | null,
  plaidCategories: string[] | null
): ScheduleCCategory | null {
  if (deductionType) return deductionType as ScheduleCCategory;
  return autoClassify(plaidCategories);
}

export function getCategoryMeta(value: ScheduleCCategory | null) {
  return SCHEDULE_C_CATEGORIES.find((c) => c.value === value) ?? null;
}

/** Meals are only 50% deductible; all other categories are 100%. */
export function deductibleAmount(amount: number, category: ScheduleCCategory): number {
  return category === "Meals" ? amount * 0.5 : amount;
}
