import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const Route = createFileRoute("/alerts")({
  component: () => (
    <ComingSoon
      title="Alerts"
      icon={Bell}
      phase="Phase 4 · Alerts"
      points={[
        "Outlet PC offline and back online",
        "Cancelled after KOT, big discounts, edited bills, cash difference",
        "Low stock",
        "Nightly day summary",
      ]}
    />
  ),
});
