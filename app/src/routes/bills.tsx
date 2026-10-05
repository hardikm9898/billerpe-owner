import { createFileRoute } from "@tanstack/react-router";
import { ReceiptText } from "lucide-react";
import { ComingSoon } from "@/components/ui";

export const Route = createFileRoute("/bills")({
  component: () => (
    <ComingSoon
      title="Bills"
      icon={ReceiptText}
      phase="Phase 1 · Watch"
      points={[
        "Every bill from every outlet, running and settled",
        "Filters: cancelled, edited after settle, due, big discounts",
        "Bill detail with KOTs and who did what",
        "Running tables per section",
      ]}
    />
  ),
});
