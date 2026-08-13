"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Megaphone, Pin, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  FormField,
  FormGrid,
  Input,
  Modal,
  Select,
  SelectFilter,
  StatCard,
  Textarea,
  Toggle,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { EMPTY, fmtDate, todayISO } from "@/lib/hrms/format";
import { titleCase } from "@/lib/hrms/status";
import type { Announcement, LookupItem } from "@/lib/hrms/types";
import { useApiData } from "@/lib/hrms/use-api-data";

/**
 * `docs/hrms/15-more-module.md §2`.
 *
 * Two corrections to the reference:
 *  - `Active` was a boolean, so Tuesday's fire-drill notice was still on the
 *    dashboard in March. Announcements carry `published_at` and `expires_at`,
 *    and expiry is what removes them (§2.2).
 *  - Audience is scoped, so a branch notice does not reach the whole company.
 */
export default function AnnouncementsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [scope, setScope] = useState<Announcement["audience_scope"]>("organization");
  const [pinned, setPinned] = useState(false);
  const [neverExpires, setNeverExpires] = useState(false);
  const announcements = useApiData<Announcement[]>("/api/hrms/announcements", []);
  const categories = useApiData<LookupItem[]>("/api/hrms/masters/announcement-category", []);
  const branches = useApiData<LookupItem[]>("/api/hrms/masters/branch", []);
  const departments = useApiData<LookupItem[]>("/api/hrms/masters/department", []);

  const today = todayISO();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return announcements.filter((a) => {
      if (category && a.category !== category) return false;
      if (!q) return true;
      return [a.title, a.body, a.category].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [announcements, search, category]);

  const live = announcements.filter(
    (a) => !a.expires_at || a.expires_at.slice(0, 10) >= today
  ).length;

  async function publish() {
    const res = await fetch("/api/hrms/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Announcement", body: "", category: categories[0]?.name ?? "General", audience_scope: scope, is_pinned: pinned, expires_at: neverExpires ? null : null }),
    });
    if (!res.ok) return toast.error("Could not publish announcement");
    toast.success("Announcement published");
    setAddOpen(false);
  }

  const columns: Column<Announcement>[] = [
    {
      key: "title",
      header: "Title",
      render: (a) => (
        <div className="flex items-start gap-2">
          {a.is_pinned && <Pin size={13} className="mt-0.5 flex-shrink-0 text-brand-500" />}
          <div className="min-w-0">
            <p className="font-medium text-gray-900">{a.title}</p>
            {a.body && (
              <p className="max-w-[320px] truncate text-xs text-gray-500" title={a.body}>
                {a.body}
              </p>
            )}
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (a) => a.category },
    {
      key: "audience",
      header: "Audience",
      render: (a) =>
        a.audience_scope === "organization"
          ? "Whole organisation"
          : `${titleCase(a.audience_scope)} — ${a.audience_scope_name ?? EMPTY}`,
    },
    { key: "published", header: "Published", render: (a) => fmtDate(a.published_at) },
    {
      key: "expires",
      header: "Expires",
      // NULL means it never expires — not a 9999 sentinel and not a stale boolean.
      render: (a) => (a.expires_at ? fmtDate(a.expires_at) : "Never"),
    },
    {
      key: "state",
      header: "State",
      render: (a) => {
        const expired = !!a.expires_at && a.expires_at.slice(0, 10) < today;
        return (
          <Badge tone={expired ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}>
            {expired ? "Expired" : "Live"}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Live" value={live} icon={Megaphone} tint="bg-brand-50 text-brand-600" />
        <StatCard
          label="Pinned"
          value={announcements.filter((a) => a.is_pinned).length}
          tint="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Expired"
          value={announcements.length - live}
          tint="bg-gray-100 text-graphite"
        />
      </div>

      <Card
        title="Announcements"
        subtitle="Expiry dates keep the dashboard from filling with stale notices"
        bodyClassName="p-4"
        actions={
          <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
            Add Announcement
          </Button>
        }
      >
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search title or body"
          onReset={() => {
            setSearch("");
            setCategory("");
          }}
          onExport={() => {}}
        >
          <SelectFilter
            label="All Categories"
            value={category}
            onChange={setCategory}
            options={categories.map((c) => ({ value: c.name, label: c.name }))}
          />
        </Toolbar>

        <DataTable columns={columns} rows={rows} getKey={(a) => a.id} empty="No announcements" dense />
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Announcement"
        width="max-w-3xl"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={publish}
            >
              Publish
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Title" required span>
            <Input placeholder="e.g. Diwali holiday schedule announced" />
          </FormField>
          <FormField label="Category" required>
            <Select defaultValue="">
              <option value="">Select</option>
              {categories.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Audience" required>
            <Select
              value={scope}
              onChange={(e) => setScope(e.target.value as Announcement["audience_scope"])}
            >
              <option value="organization">Whole organisation</option>
              <option value="branch">Branch</option>
              <option value="department">Department</option>
              <option value="business_unit">Business unit</option>
            </Select>
          </FormField>
          {scope !== "organization" && (
            <FormField label={titleCase(scope)} required span>
              <Select defaultValue="">
                <option value="">Select</option>
                {(scope === "branch" ? branches : departments).map((x) => (
                  <option key={x.id}>{x.name}</option>
                ))}
              </Select>
            </FormField>
          )}
          <FormField label="Publish On" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField
            label="Expires On"
            required={!neverExpires}
            hint="An expiry is what removes it from the dashboard"
          >
            <div className="space-y-2">
              <Input type="date" disabled={neverExpires} />
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <Toggle checked={neverExpires} onChange={setNeverExpires} label="Never expires" />
                Never expires
              </label>
            </div>
          </FormField>
          <FormField label="Body" required span>
            <Textarea rows={4} placeholder="The announcement text employees will read" />
          </FormField>
          <FormField label="Pin to top" span>
            <div className="flex items-center gap-2 pt-1">
              <Toggle checked={pinned} onChange={setPinned} label="Pin to top" />
              <span className="text-xs text-gray-600">Shows above other announcements</span>
            </div>
          </FormField>
        </FormGrid>
      </Modal>
    </div>
  );
}
