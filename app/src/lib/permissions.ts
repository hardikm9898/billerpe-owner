import type { Perms } from "./api";

// The Web POS permission modules, in its own words (uat-backend-v2
// appv1/core.js MODULE_LABELS), the order the design shows them in.

export const MODULES: { key: string; label: string }[] = [
  { key: "biller", label: "Billing" },
  { key: "keyboard-billing", label: "Keyboard Billing" },
  { key: "orders", label: "Orders" },
  { key: "reports", label: "Reports" },
  { key: "cash-session", label: "Opening & Closing" },
  { key: "expense", label: "Expense" },
  { key: "menu", label: "Menu" },
  { key: "tables", label: "Table Management" },
  { key: "reservations", label: "Reservations" },
  { key: "queue", label: "Waitlist Queue" },
  { key: "kds", label: "Kitchen Display" },
  { key: "dashboard", label: "Dashboard" },
  { key: "users", label: "Manage Users" },
  { key: "permissions", label: "Roles & Permissions" },
  { key: "stock-masters", label: "Stock Masters" },
  { key: "stock-transactions", label: "Stock Transactions" },
  { key: "stock-recipes", label: "Recipes & Production" },
  { key: "stock-reports", label: "Stock Reports" },
  { key: "ops-billing", label: "Billing Settings" },
  { key: "ops-hardware", label: "Printers & Devices" },
  { key: "ops-experience", label: "Customer Experience" },
  { key: "ops-ledger", label: "Ledger" },
  { key: "system", label: "System" },
  { key: "audit-log", label: "Audit Log" },
];

export const SPECIALS: { key: string; label: string }[] = [
  { key: "orders.editAfterKot", label: "Edit items after the KOT is sent" },
  { key: "orders.reopenSettled", label: "Edit a settled bill" },
  { key: "orders.deleteOrder", label: "Delete orders" },
  { key: "tables.mergeTransfer", label: "Move or merge tables" },
  { key: "system.remakeOrderSequence", label: "Renumber bills" },
  { key: "users.editPermissions", label: "Change a user's permissions" },
];

export const ROLES = ["Manager", "Cashier", "Captain", "Kitchen Staff", "Inventory Manager", "Accountant"];

export const clonePerms = (p: Perms): Perms => JSON.parse(JSON.stringify(p));

/** Modules and specials where `p` differs from the role defaults `d`. */
export function changedFrom(p: Perms, d: Perms) {
  const modules = MODULES.filter((m) => JSON.stringify(p.modules[m.key]) !== JSON.stringify(d.modules[m.key])).map((m) => m.key);
  const special = SPECIALS.filter((s) => !!p.special[s.key] !== !!d.special[s.key]).map((s) => s.key);
  return new Set([...modules, ...special]);
}
