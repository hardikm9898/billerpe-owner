import { Link, createFileRoute, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Fingerprint, LifeBuoy, Loader2, LogOut, Moon, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { AlertRules } from "@/components/AlertRules";
import { setLockEnabled, useLockSetting } from "@/components/AppLock";
import { Switch } from "@/components/forms";
import { Segmented } from "@/components/pickers";
import { Card, IconTile, Screen, Section, TopBar } from "@/components/ui";
import type { OutletsResult } from "@/lib/api";
import { initials } from "@/lib/format";
import { LANGUAGES, setLang, useLang, type Lang } from "@/lib/i18n";
import { useOwner, useSession } from "@/lib/session";
import { setDark, useDark } from "@/lib/theme";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/profile")({ component: Profile });

// Profile (design v1 "Profile, language, alert rules"): who is logged in,
// the phone's language, alert rules, fingerprint lock, dark mode, support
// and log out.

const SUPPORT = "+919737100886";

function Profile() {
  const { owner } = useOwner();
  const { logout } = useSession();
  const outlets = useCall<OutletsResult>("outlets");
  const [busy, setBusy] = useState(false);
  const count = outlets.data?.outlets.length;
  const lang = useLang();
  const lock = useLockSetting();
  const dark = useDark();
  // Opened from the Alerts screen's "Alert rules": go straight to them.
  const hash = useRouterState({ select: (st) => st.location.hash });
  useEffect(() => {
    if (hash === "rules") setTimeout(() => document.getElementById("rules")?.scrollIntoView({ behavior: "smooth" }), 300);
  }, [hash]);

  return (
    <Screen>
      <TopBar title="Profile & settings" />
      <div className="px-4 pt-1.5">
        <Card className="flex items-center gap-3.5 bg-dark text-on-dark">
          <span translate="no" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand font-display text-xl font-extrabold text-white">
            {initials(owner.name)}
          </span>
          <div className="min-w-0">
            <div translate="no" className="truncate font-display text-[19px] font-bold">
              {owner.name || "Owner"}
            </div>
            <div className="text-[12.5px] font-semibold text-on-dark-2">
              <span translate="no">{owner.mobile.replace(/^(\d{5})(\d{5})$/, "$1 $2")}</span>
              {count !== undefined && ` · ${count === 1 ? "Owner of 1 outlet" : `Owner of ${count} outlets`}`}
            </div>
          </div>
        </Card>
      </div>

      <Section title="Language" />
      <div className="px-4" translate="no">
        <Segmented<Lang> items={LANGUAGES.map((l) => ({ key: l.id, label: l.label }))} value={lang} onChange={(l) => void setLang(l)} />
      </div>

      <AlertRules />

      <Section title="Security & help" />
      <div className="mx-4 overflow-hidden rounded-[20px] bg-surface">
        <div className="flex min-h-[60px] items-center gap-3 px-3.5 py-3">
          <IconTile tone="muted" icon={Fingerprint} />
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-bold">Fingerprint lock</div>
            <div className="text-[12.5px] font-semibold text-ink-2">{lock.available ? "Ask when the app opens" : "Set up a fingerprint in the phone's settings first"}</div>
          </div>
          <Switch on={lock.available && lock.on} disabled={!lock.available} onChange={(v) => void setLockEnabled(v)} label="Fingerprint lock" />
        </div>
        <div className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-3">
          <IconTile tone="muted" icon={Moon} />
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-bold">Dark mode</div>
            <div className="text-[12.5px] font-semibold text-ink-2">Easier on the eyes at night</div>
          </div>
          <Switch on={dark} onChange={setDark} label="Dark mode" />
        </div>
        <Link to="/support" className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-3 text-ink">
          <IconTile tone="muted" icon={LifeBuoy} />
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-bold">Support tickets</div>
            <div className="text-[12.5px] font-semibold text-ink-2">Raise a ticket, read BillerPe's replies</div>
          </div>
          <ChevronRight className="size-5 text-chev" />
        </Link>
        <a href={`tel:${SUPPORT}`} className="flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-3 text-ink">
          <IconTile tone="muted" icon={Phone} />
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-bold">Call BillerPe support</div>
            <div className="text-[12.5px] font-semibold text-ink-2">Help with the app or an outlet</div>
          </div>
          <ChevronRight className="size-5 text-chev" />
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
            <div className="text-[12.5px] font-semibold text-ink-2">
              Owner App <span translate="no">{__APP_VERSION__}</span>
            </div>
          </div>
        </button>
      </div>
    </Screen>
  );
}
