import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Loader2, LogOut, Phone, Store } from "lucide-react";
import { useState } from "react";
import { Card, IconTile, Screen, Section, TopBar } from "@/components/ui";
import type { OutletsResult } from "@/lib/api";
import { initials } from "@/lib/format";
import { useOwner, useSession } from "@/lib/session";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/profile")({ component: Profile });

// Profile (design v1 "Profile, language, alert rules"). Phase 0: who is
// logged in, support, log out. Language, alert rules and fingerprint lock
// arrive in their phases.

const SUPPORT = "+919737100886";

function Profile() {
  const { owner } = useOwner();
  const { logout } = useSession();
  const outlets = useCall<OutletsResult>("outlets");
  const [busy, setBusy] = useState(false);
  const count = outlets.data?.outlets.length;

  return (
    <Screen>
      <TopBar title="Profile & settings" />
      <div className="px-4 pt-1.5">
        <Card className="flex items-center gap-3.5 bg-dark text-on-dark">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand font-display text-xl font-extrabold">{initials(owner.name)}</span>
          <div className="min-w-0">
            <div className="truncate font-display text-[19px] font-bold">{owner.name || "Owner"}</div>
            <div className="text-[12.5px] font-semibold text-on-dark-2">
              {owner.mobile.replace(/^(\d{5})(\d{5})$/, "$1 $2")}
              {count !== undefined && ` · Owner of ${count} outlet${count === 1 ? "" : "s"}`}
            </div>
          </div>
        </Card>
      </div>

      {outlets.data && outlets.data.outlets.length > 0 && (
        <>
          <Section title="Your outlets" />
          <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
            {outlets.data.outlets.map((o) => (
              <div key={o.id} className="flex min-h-[56px] items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0">
                <IconTile tone="muted" icon={Store} />
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold">{o.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <Section title="Help" />
      <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
        <a href={`tel:${SUPPORT}`} className="flex min-h-[60px] items-center gap-3 px-3.5 py-3 text-ink">
          <IconTile tone="muted" icon={Phone} />
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-bold">Call BillerPe support</div>
            <div className="text-[12.5px] font-semibold text-ink-2">+91 97371 00886</div>
          </div>
          <ChevronRight className="size-5 text-[#9A8F88]" />
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await logout();
          }}
          className="flex min-h-[60px] w-full items-center gap-3 border-t border-line px-3.5 py-3 text-left"
        >
          <IconTile tone="brand" icon={busy ? Loader2 : LogOut} className={busy ? "[&>svg]:animate-spin" : ""} />
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-bold text-brand">Log out</div>
            <div className="text-[12.5px] font-semibold text-ink-2">BillerPe Owner {__APP_VERSION__}</div>
          </div>
        </button>
      </div>
    </Screen>
  );
}
