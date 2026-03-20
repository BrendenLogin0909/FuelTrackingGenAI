import type { WidgetDefinition } from "@/lib/dashboard/types";

function blockedWidget(
  id: string,
  title: string,
  summary: string,
  priority: WidgetDefinition["priority"],
  blockedReason: string
): WidgetDefinition {
  return {
    id,
    title,
    summary,
    priority,
    status: "blocked",
    blockedReason,
    render: () => ({ emptyMessage: blockedReason }),
  };
}

export const blockedWidgets: WidgetDefinition[] = [
  blockedWidget(
    "chg-007-fuel-spend-by-vehicle",
    "Fuel Spend by Vehicle",
    "Compare spend across vehicles.",
    "high",
    "Blocked until vehicle identifiers are stored on transactions."
  ),
  blockedWidget(
    "chg-008-fuel-spend-by-driver",
    "Fuel Spend by Driver",
    "Compare spend across drivers.",
    "medium",
    "Blocked until driver identifiers are stored on transactions."
  ),
  blockedWidget(
    "chg-010-fuel-spend-by-region",
    "Fuel Spend by Region",
    "Compare geographic cost differences.",
    "medium",
    "Blocked until region or location fields are captured on transactions."
  ),
  blockedWidget(
    "chg-013-efficiency-by-vehicle",
    "Efficiency by Vehicle",
    "Compare efficiency across vehicles.",
    "high",
    "Blocked until vehicle identifiers are stored on transactions."
  ),
  blockedWidget(
    "chg-014-best-worst-efficiency",
    "Best and Worst Efficiency",
    "Highlight the strongest and weakest vehicle performers.",
    "medium",
    "Blocked until vehicle identifiers are stored on transactions."
  ),
  blockedWidget(
    "chg-018-vehicle-usage-distribution",
    "Vehicle Usage Distribution",
    "Find overused and underused vehicles.",
    "medium",
    "Blocked until vehicle identifiers are stored on transactions."
  ),
  blockedWidget(
    "chg-019-budget-vs-actual",
    "Budget vs Actual Fuel Spend",
    "Compare actual spend against budget targets.",
    "high",
    "Blocked until budget configuration exists in the application."
  ),
  blockedWidget(
    "chg-032-low-ocr-confidence",
    "Low OCR Confidence Transactions",
    "Surface documents needing review.",
    "high",
    "Blocked until OCR confidence scores are stored with transactions."
  ),
  blockedWidget(
    "chg-033-ocr-correction-rate",
    "OCR Correction Rate",
    "Measure how often extracted values are manually edited.",
    "high",
    "Blocked until extraction audit history is stored."
  ),
  blockedWidget(
    "chg-034-most-corrected-ocr-fields",
    "Most Corrected OCR Fields",
    "Identify extraction fields with the highest correction rates.",
    "medium",
    "Blocked until extraction audit history is stored."
  ),
  blockedWidget(
    "chg-035-ocr-turnaround-time",
    "OCR Turnaround Time",
    "Measure elapsed time from upload to verification.",
    "medium",
    "Blocked until verification workflow states and timestamps exist."
  ),
  blockedWidget(
    "chg-036-source-quality-by-station",
    "Source Quality by Station",
    "Compare OCR quality across stations.",
    "medium",
    "Blocked until OCR quality metrics and review outcomes are stored."
  ),
  blockedWidget(
    "chg-039-vehicle-operating-cost-ranking",
    "Vehicle Operating Cost Ranking",
    "Rank vehicles by operating cost.",
    "medium",
    "Blocked until vehicle identifiers are stored on transactions."
  ),
  blockedWidget(
    "chg-040-vehicle-health-indicator",
    "Vehicle Health Indicator",
    "Use fuel signals to suggest vehicles needing attention.",
    "medium",
    "Blocked until vehicle identifiers are stored on transactions."
  ),
];
