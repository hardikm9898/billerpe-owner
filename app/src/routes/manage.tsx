import { createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const Route = createFileRoute("/manage")({
  component: () => (
    <ComingSoon
      title="Manage"
      icon={SlidersHorizontal}
      phase="Phase 3 · Manage"
      points={[
        "Menu: prices, items on/off, add and edit items",
        "Staff & access: add, switch off, reset PIN, permissions",
        "Tables & sections, tax, payment modes, promo codes",
        "Stock masters: raw materials, suppliers, recipes",
      ]}
    />
  ),
});
