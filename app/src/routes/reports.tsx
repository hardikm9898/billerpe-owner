import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const Route = createFileRoute("/reports")({
  component: () => (
    <ComingSoon
      title="Reports"
      icon={BarChart3}
      phase="Phase 2 · Reports"
      points={[
        "Every Web POS report, any date range",
        "One outlet or all outlets together",
        "Download as PDF or Excel, share on WhatsApp",
      ]}
    />
  ),
});
