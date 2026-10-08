import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, MessageCircle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorNote, Field, SaveButton, SelectField, Toast } from "@/components/forms";
import { OutletPicker, Sheet, useOutlets, type OutletChoice } from "@/components/pickers";
import { Card, ErrorState, Screen, Skeleton, Tag, TopBar } from "@/components/ui";
import { call } from "@/lib/api";
import { fullDate, time } from "@/lib/format";
import { useCall } from "@/lib/useCall";

export const Route = createFileRoute("/support")({ component: SupportScreen });

// Support tickets to BillerPe (SuperAdmin phase 7, owner 2026-10-08):
// raise one for an outlet, and read BillerPe support's replies here (they
// also come on WhatsApp). The owner can answer while a ticket is open.

interface TicketMessage {
  id: number;
  from: "you" | "billerpe";
  body: string;
  at: string;
}
interface OwnerTicket {
  id: number;
  number: string;
  subject: string;
  category: string;
  state: "new" | "open" | "waiting" | "closed";
  stateLabel: string;
  canReply: boolean;
  resolution: string;
  createdAt: string;
  messages: TicketMessage[];
  replies: number;
}
interface TicketsResult {
  tickets: OwnerTicket[];
  page: number;
  totalRecords: number;
}

const TONE = { new: "muted", open: "info", waiting: "warn", closed: "ok" } as const;
const CATEGORIES = ["Billing and printing", "Printer", "KOT and kitchen display", "Menu and items", "Reports", "Stock", "Outlet PC and sync", "Owner App", "Plan and payment", "Other"];

function SupportScreen() {
  const { outlets, loading } = useOutlets();
  const [pick, setPick] = useState<OutletChoice>("all");
  const outletId = pick === "all" ? outlets[0]?.id : pick;
  const q = useCall<TicketsResult>("tickets", outletId ? [outletId] : [0], 60000);
  const [openId, setOpenId] = useState<number | null>(null);
  const [raising, setRaising] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast((x) => (x === t ? null : x)), 3500);
  };
  const outlet = outlets.find((o) => o.id === outletId);
  const opened = q.data?.tickets.find((t) => t.id === openId) ?? null;
  return (
    <Screen>
      <TopBar title="Support tickets" sub={outlet?.name} />
      <div className="flex items-center gap-2 px-4 pb-2 pt-1.5">
        {outlets.length > 1 && <OutletPicker value={outletId ?? "all"} onChange={setPick} outlets={outlets} allowAll={false} />}
        <button type="button" onClick={() => setRaising(true)} disabled={!outletId} className="ml-auto flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-[13.5px] font-extrabold text-white disabled:opacity-50">
          <Plus className="size-4" /> Raise a ticket
        </button>
      </div>
      <div className="space-y-2.5 px-4">
        {loading || q.loading ? (
          <>
            <Skeleton className="h-[76px]" />
            <Skeleton className="h-[76px]" />
          </>
        ) : q.error && !q.data ? (
          <ErrorState message={q.error} onRetry={() => void q.refresh()} />
        ) : !q.data?.tickets.length ? (
          <Card className="flex flex-col items-center py-8 text-center">
            <LifeBuoy className="size-8 text-ink-3" />
            <p className="mt-2 text-[15px] font-bold">No tickets yet</p>
            <p className="mt-1 text-[13px] font-semibold text-ink-2">Something not working at the outlet? Raise a ticket: BillerPe support replies here and on WhatsApp.</p>
          </Card>
        ) : (
          q.data.tickets.map((t) => (
            <button key={t.id} type="button" onClick={() => setOpenId(t.id)} className="block w-full rounded-[20px] bg-surface p-4 text-left">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-extrabold text-ink-3">{t.number}</span>
                <Tag tone={TONE[t.state] ?? "muted"}>{t.stateLabel}</Tag>
              </div>
              <div className="mt-1 truncate text-[15px] font-bold">{t.subject}</div>
              <div className="text-[12.5px] font-semibold text-ink-2">
                {fullDate(t.createdAt)} · {t.category}
              </div>
              {t.replies > 0 && (
                <div className="mt-1 flex items-center gap-1 text-[12.5px] font-bold text-brand">
                  <MessageCircle className="size-3.5" /> BillerPe replied · tap to read
                </div>
              )}
            </button>
          ))
        )}
      </div>
      {opened && outletId && <TicketSheet ticket={opened} outletId={outletId} onClose={() => setOpenId(null)} onReplied={() => void q.refresh().then(() => flash("Reply sent to BillerPe support"))} />}
      {outletId && (
        <RaiseSheet
          open={raising}
          outletId={outletId}
          outletName={outlet?.name ?? ""}
          onClose={() => setRaising(false)}
          onDone={(n) => {
            setRaising(false);
            void q.refresh().then(() => flash(`Ticket ${n} raised. BillerPe replies here and on WhatsApp.`));
          }}
        />
      )}
      <Toast text={toast} />
    </Screen>
  );
}

function TicketSheet({ ticket, outletId, onClose, onReplied }: { ticket: OwnerTicket; outletId: number; onClose: () => void; onReplied: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await call("ticketReply", outletId, ticket.id, text);
      setText("");
      onReplied();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open onClose={onClose} title={`${ticket.number} · ${ticket.subject}`}>
      <p className="mb-2 text-[12.5px] font-semibold text-ink-2">{ticket.stateLabel}</p>
      <ol className="space-y-2.5" aria-label="Conversation">
        {ticket.messages.map((m) => (
          <li key={m.id} className={m.from === "billerpe" ? "flex flex-col items-start" : "flex flex-col items-end"}>
            <div className={m.from === "billerpe" ? "max-w-[88%] rounded-2xl bg-surface px-3.5 py-2.5" : "max-w-[88%] rounded-2xl bg-dark px-3.5 py-2.5 text-on-dark"}>
              <p className={m.from === "billerpe" ? "text-[11.5px] font-extrabold text-brand" : "text-[11.5px] font-extrabold text-on-dark-2"}>{m.from === "billerpe" ? "BillerPe support" : "You"}</p>
              <p className="whitespace-pre-wrap break-words text-[14px] font-semibold">{m.body}</p>
            </div>
            <span className="mt-0.5 px-1 text-[11.5px] font-semibold text-ink-3">
              {fullDate(m.at)} {time(m.at)}
            </span>
          </li>
        ))}
      </ol>
      {ticket.canReply ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-bold text-ink-2">Your reply</span>
            <textarea value={text} rows={3} maxLength={4000} onChange={(e) => setText(e.target.value)} className="w-full rounded-[14px] border border-line-2 bg-surface p-3 text-[14.5px] font-semibold outline-none focus:border-ink" />
          </label>
          <ErrorNote text={error} />
          <SaveButton busy={busy} disabled={!text.trim()} onClick={() => void send()}>
            Send reply
          </SaveButton>
        </div>
      ) : (
        <p className="mt-4 text-[12.5px] font-semibold text-ink-2">This ticket is closed. Raise a new ticket if the problem comes back.</p>
      )}
    </Sheet>
  );
}

function RaiseSheet({ open, outletId, outletName, onClose, onDone }: { open: boolean; outletId: number; outletName: string; onClose: () => void; onDone: (number: string) => void }) {
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setSubject("");
    setDetails("");
    setCategory(CATEGORIES[0]!);
    setError(null);
  }, [open]);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ id: number; number: string }>("ticketRaise", outletId, { subject, details, category });
      onDone(r.number);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Raise a ticket">
      <div className="space-y-3.5">
        <p className="text-[12.5px] font-semibold text-ink-2">For {outletName}. Replies come here and on WhatsApp to your number.</p>
        <Field label="What is the problem?" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} placeholder="Bill printer not printing" />
        <SelectField label="About" value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold text-ink-2">What happened?</span>
          <textarea value={details} rows={4} maxLength={4000} onChange={(e) => setDetails(e.target.value)} className="w-full rounded-[14px] border border-line-2 bg-surface p-3 text-[14.5px] font-semibold outline-none focus:border-ink" />
        </label>
        <ErrorNote text={error} />
        <SaveButton busy={busy} disabled={!subject.trim() || !details.trim()} onClick={() => void send()}>
          Send to BillerPe
        </SaveButton>
      </div>
    </Sheet>
  );
}
