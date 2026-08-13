"use client";

import { useMemo, useState } from "react";
import { CakeSlice, CalendarDays, ChevronLeft, ChevronRight, PartyPopper, Plane, UserPlus } from "lucide-react";
import { Badge, Button, Card, EmptyState, Toggle } from "@/components/hrms/ui";
import { fmtDate } from "@/lib/hrms/format";
import { useApiData } from "@/lib/hrms/use-api-data";
import { cn } from "@/lib/utils";

/**
 * `docs/hrms/03-calendar.md`.
 *
 * Most of what appears here is **derived** — holidays, approved leave,
 * birthdays, work anniversaries and joining dates already exist as rows
 * elsewhere. The calendar reads them rather than storing a second copy that
 * drifts, which is why each layer can be toggled independently.
 */

type EventKind = "holiday" | "leave" | "birthday" | "anniversary" | "joinee";

interface CalendarEvent {
  date: string;
  kind: EventKind;
  label: string;
  detail?: string;
}

const KIND_META: Record<EventKind, { label: string; dot: string; badge: string; icon: typeof CakeSlice }> = {
  holiday: { label: "Holidays", dot: "bg-brand-500", badge: "bg-brand-100 text-brand-700", icon: CalendarDays },
  leave: { label: "Approved leave", dot: "bg-slate-400", badge: "bg-slate-200 text-slate-700", icon: Plane },
  birthday: { label: "Birthdays", dot: "bg-amber-400", badge: "bg-amber-100 text-amber-800", icon: CakeSlice },
  anniversary: { label: "Work anniversaries", dot: "bg-green-500", badge: "bg-green-100 text-green-700", icon: PartyPopper },
  joinee: { label: "New joinees", dot: "bg-brand-300", badge: "bg-brand-50 text-brand-600", icon: UserPlus },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [layers, setLayers] = useState<Record<EventKind, boolean>>({
    holiday: true,
    leave: true,
    birthday: true,
    anniversary: true,
    joinee: true,
  });

  const events = useApiData<CalendarEvent[]>("/api/hrms/calendar", []);

  /** Monday-first grid, padded to whole weeks. */
  const grid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const leadingBlanks = (first.getDay() + 6) % 7;

    const cells: { date: string | null; day: number | null }[] = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date: iso, day: d });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  }, [cursor]);

  const eventsFor = (date: string) =>
    events.filter((e) => e.date.slice(0, 10) === date && layers[e.kind]);

  const monthEvents = useMemo(() => {
    const prefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
    return events
      .filter((e) => e.date.startsWith(prefix) && layers[e.kind])
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, cursor, layers]);

  const todayISOString = new Date().toISOString().slice(0, 10);
  const monthLabel = new Date(cursor.year, cursor.month).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card
        title={monthLabel}
        subtitle="Holidays, leave, birthdays, anniversaries and joining dates, read from where they already live"
        bodyClassName="p-4"
        actions={
          <div className="flex items-center gap-1">
            <Button icon={ChevronLeft} onClick={() => shift(-1)} aria-label="Previous month">
              Prev
            </Button>
            <Button
              onClick={() => {
                const d = new Date();
                setCursor({ year: d.getFullYear(), month: d.getMonth() });
              }}
            >
              Today
            </Button>
            <Button icon={ChevronRight} onClick={() => shift(1)} aria-label="Next month">
              Next
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="bg-gray-50 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500"
            >
              {w}
            </div>
          ))}
          {grid.map((cell, i) => {
            if (!cell.date) {
              return <div key={`blank-${i}`} className="min-h-[92px] bg-gray-50/60" />;
            }
            const dayEvents = eventsFor(cell.date);
            const isToday = cell.date === todayISOString;
            const weekend = i % 7 >= 5;
            return (
              <div
                key={cell.date}
                className={cn(
                  "min-h-[92px] bg-white p-1.5",
                  weekend && "bg-gray-50/70",
                  isToday && "ring-2 ring-inset ring-brand-400"
                )}
              >
                <span
                  className={cn(
                    "inline-grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold",
                    isToday ? "bg-brand-500 text-white" : "text-gray-500"
                  )}
                >
                  {cell.day}
                </span>
                <ul className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((e, j) => (
                    <li
                      key={`${e.kind}-${j}`}
                      className="flex items-center gap-1 truncate text-[10.5px] text-gray-700"
                      title={`${e.label}${e.detail ? ` — ${e.detail}` : ""}`}
                    >
                      <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", KIND_META[e.kind].dot)} />
                      <span className="truncate">{e.label}</span>
                    </li>
                  ))}
                  {dayEvents.length > 3 && (
                    <li className="text-[10px] text-gray-400">+{dayEvents.length - 3} more</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      <aside className="space-y-4">
        <Card title="Layers" subtitle="Each is derived from its own source">
          <ul className="space-y-3">
            {(Object.keys(KIND_META) as EventKind[]).map((kind) => (
              <li key={kind} className="flex items-center gap-2.5">
                <span className={cn("h-2.5 w-2.5 flex-shrink-0 rounded-full", KIND_META[kind].dot)} />
                <span className="flex-1 text-sm text-gray-700">{KIND_META[kind].label}</span>
                <Toggle
                  checked={layers[kind]}
                  onChange={(v) => setLayers((prev) => ({ ...prev, [kind]: v }))}
                  label={KIND_META[kind].label}
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="This Month" bodyClassName="p-0">
          {monthEvents.length === 0 ? (
            <EmptyState title="Nothing scheduled" icon={CalendarDays} />
          ) : (
            <ul className="divide-y divide-gray-100">
              {monthEvents.map((e, i) => {
                const Icon = KIND_META[e.kind].icon;
                return (
                  <li key={`${e.date}-${i}`} className="flex items-start gap-3 px-5 py-2.5">
                    <span className="mt-0.5 flex-shrink-0 text-gray-400">
                      <Icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{e.label}</p>
                      {e.detail && <p className="truncate text-xs text-gray-500">{e.detail}</p>}
                    </div>
                    <Badge tone={KIND_META[e.kind].badge} className="flex-shrink-0 text-[10px]">
                      {fmtDate(e.date).slice(0, 5)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </aside>
    </div>
  );
}
