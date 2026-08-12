"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Card, EmptyState } from "@/components/hrms/ui";
import { SETTINGS_GENERAL, SETTINGS_ORG, type SettingsItem } from "@/lib/hrms/settings-nav";

/** `docs/hrms/00-navigation-map.md §4` — the settings launcher, two groups. */
export default function HrmsSettingsPage() {
  const [query, setQuery] = useState("");

  const filter = (items: SettingsItem[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.label} ${i.description}`.toLowerCase().includes(q));
  };

  const general = useMemo(() => filter(SETTINGS_GENERAL), [query]);
  const org = useMemo(() => filter(SETTINGS_ORG), [query]);

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search settings"
          className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-8 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {general.length === 0 && org.length === 0 && (
        <Card>
          <EmptyState title="No settings match that search" icon={Search} />
        </Card>
      )}

      {general.length > 0 && <SettingsGroup title="General" items={general} />}
      {org.length > 0 && <SettingsGroup title="Organization Structure" items={org} />}
    </div>
  );
}

function SettingsGroup({ title, items }: { title: string; items: SettingsItem[] }) {
  return (
    <section>
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/30"
          >
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <item.icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900">{item.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-gray-500">
                {item.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
