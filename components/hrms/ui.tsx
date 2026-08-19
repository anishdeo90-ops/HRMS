"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Download, Filter, Inbox, RotateCcw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMPTY } from "@/lib/hrms/format";
import { isTabActive, visibleFor, type HrmsTab } from "@/lib/hrms/nav";
import type { Role } from "@/lib/types";

/* ────────────────────────────────────────────────────────────────
   Page chrome
   ──────────────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** The horizontal tab strip a module shows under its title. */
export function TabStrip({ tabs, role }: { tabs: HrmsTab[]; role: Role }) {
  const pathname = usePathname();
  const visible = visibleFor(tabs, role);
  if (visible.length === 0) return null;

  return (
    <div className="mb-5 -mx-1 overflow-x-auto">
      <div className="flex min-w-max gap-1 border-b border-gray-200 px-1">
        {visible.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Sub-tabs inside a page (My KRAs / KRA Master, My Jobs / All Jobs, …). */
export function SubTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="mb-4 inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            value === tab.key
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          )}
        >
          {tab.label}
          {tab.count != null && (
            <span
              className={cn(
                "ml-1.5 rounded px-1.5 py-px text-[10px]",
                value === tab.key ? "bg-brand-50 text-brand-600" : "bg-gray-200 text-gray-600"
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-gray-200 bg-white", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold text-gray-800">{title}</h2>}
            {subtitle && <p className="mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Buttons
   ──────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  ghost: "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-green-600 text-white hover:bg-green-700",
};

export function Button({
  variant = "secondary",
  icon: Icon,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_VARIANT[variant],
        className
      )}
    >
      {Icon && <Icon size={13} className="flex-shrink-0" />}
      {children}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   Badges, stats, empty states
   ──────────────────────────────────────────────────────────────── */

export function Badge({
  tone = "bg-gray-100 text-gray-600",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        tone,
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tint = "bg-brand-50 text-brand-600",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tint?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        {Icon && (
          <span className={cn("grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg", tint)}>
            <Icon size={15} />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </>
  );

  const className = cn(
    "block rounded-xl border border-gray-200 bg-white p-4",
    href && "transition-colors hover:border-brand-300 hover:bg-brand-50/30"
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  hint,
  icon: Icon = Inbox,
  action,
}: {
  title?: string;
  hint?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-gray-100 text-gray-400">
        <Icon size={20} />
      </span>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-gray-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** A label/value pair for read-only detail panes. Nulls collapse to one dash. */
export function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  const isEmpty = value == null || value === "";
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className={cn("mt-0.5 text-sm", isEmpty ? "text-gray-400" : "text-gray-900")}>
        {isEmpty ? EMPTY : value}
      </dd>
    </div>
  );
}

export function FieldGrid({
  columns = 3,
  children,
}: {
  columns?: 2 | 3 | 4;
  children: React.ReactNode;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "sm:grid-cols-2 lg:grid-cols-4"
      )}
    >
      {children}
    </dl>
  );
}

/* ────────────────────────────────────────────────────────────────
   Toolbar
   ──────────────────────────────────────────────────────────────── */

export function Toolbar({
  search,
  onSearch,
  placeholder = "Search",
  onReset,
  onExport,
  onFilter,
  children,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  placeholder?: string;
  onReset?: () => void;
  onExport?: () => void;
  onFilter?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {onSearch && (
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-8 pr-8 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}
      {children}
      <div className="ml-auto flex items-center gap-2">
        {onFilter && <Button icon={Filter} onClick={onFilter}>Filter</Button>}
        {onReset && <Button icon={RotateCcw} onClick={onReset}>Reset</Button>}
        {onExport && <Button icon={Download} onClick={onExport}>Export CSV</Button>}
      </div>
    </div>
  );
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ────────────────────────────────────────────────────────────────
   DataTable
   ──────────────────────────────────────────────────────────────── */

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  /** Width utility, e.g. "w-40". Tables scroll horizontally rather than squash. */
  className?: string;
  render: (row: T, index: number) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  getKey,
  empty,
  onRowClick,
  selectable,
  selected,
  onSelectedChange,
  footer,
  dense,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  footer?: React.ReactNode;
  dense?: boolean;
}) {
  const ids = useMemo(() => rows.map(getKey), [rows, getKey]);
  const allSelected = selectable && ids.length > 0 && ids.every((id) => selected?.includes(id));

  function toggleAll() {
    if (!onSelectedChange) return;
    onSelectedChange(allSelected ? [] : ids);
  }

  function toggleOne(id: string) {
    if (!onSelectedChange) return;
    const next = selected?.includes(id)
      ? selected.filter((s) => s !== id)
      : [...(selected ?? []), id];
    onSelectedChange(next);
  }

  const pad = dense ? "px-3 py-2" : "px-4 py-2.5";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {selectable && (
                <th className={cn(pad, "w-10 text-left")}>
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={!!allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    pad,
                    "whitespace-nowrap font-semibold",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    (!col.align || col.align === "left") && "text-left",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)}>
                  {typeof empty === "string" || empty == null ? (
                    <EmptyState title={(empty as string) ?? "No records found"} />
                  ) : (
                    empty
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const id = getKey(row);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-t border-gray-100",
                      i % 2 === 1 && "bg-gray-50/60",
                      onRowClick && "cursor-pointer hover:bg-brand-50/50",
                      selected?.includes(id) && "bg-brand-50"
                    )}
                  >
                    {selectable && (
                      <td className={pad} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select row ${i + 1}`}
                          checked={!!selected?.includes(id)}
                          onChange={() => toggleOne(id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          pad,
                          "whitespace-nowrap text-gray-700",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center"
                        )}
                      >
                        {col.render(row, i)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {(footer || rows.length > 0) && (
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500">
          <span>
            {rows.length} {rows.length === 1 ? "record" : "records"}
          </span>
          {footer}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Form primitives
   ──────────────────────────────────────────────────────────────── */

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-xs font-semibold text-gray-600">
      {children}
      {required && <span className="ml-0.5 text-brand-600">*</span>}
    </label>
  );
}

const CONTROL =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:bg-gray-50 disabled:text-gray-500";

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(CONTROL, className)} />;
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...rest} className={cn(CONTROL, className)} />;
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn(CONTROL, "bg-white", className)}>
      {children}
    </select>
  );
}

export function FormGrid({
  columns = 2,
  children,
}: {
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {children}
    </div>
  );
}

export function FormField({
  label,
  required,
  hint,
  span,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  span?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={span ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <Label required={required}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-brand-500" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "h-3.5 w-3.5 rounded-full bg-white transition-transform",
          checked ? "translate-x-[19px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────
   Modal / side panel
   ──────────────────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  width = "max-w-2xl",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("w-full rounded-2xl bg-white shadow-2xl", width)}
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={17} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/** Local search over a row set — keeps every list page from rewriting it. */
export function useSearch<T>(rows: T[], fields: (row: T) => (string | number | null | undefined)[]) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      fields(row).some((f) => String(f ?? "").toLowerCase().includes(q))
    );
  }, [rows, query, fields]);
  return { query, setQuery, filtered };
}
