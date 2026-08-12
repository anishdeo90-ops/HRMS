"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Upload } from "lucide-react";
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
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import SettingsPage from "@/components/hrms/settings-page";
import { DEMO_BRANCHES, DEMO_HOLIDAYS } from "@/lib/hrms/demo-data";
import { fmtDate, todayISO } from "@/lib/hrms/format";
import { titleCase } from "@/lib/hrms/status";
import type { Holiday } from "@/lib/hrms/types";

/** `docs/hrms/12-advanced-settings-cron-holiday.md §6`. */

const TYPE_TONE: Record<Holiday["holiday_type"], string> = {
  public: "bg-brand-100 text-brand-700",
  regional: "bg-slate-200 text-slate-700",
  restricted: "bg-amber-100 text-amber-800",
};

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function HolidayCalendarPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [year, setYear] = useState("2026");
  const [addOpen, setAddOpen] = useState(false);

  const today = todayISO();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DEMO_HOLIDAYS.filter((h) => {
      if (year && !h.holiday_date.startsWith(year)) return false;
      if (type && h.holiday_type !== type) return false;
      if (!q) return true;
      return [h.name, h.applies_to].some((f) => f.toLowerCase().includes(q));
    }).sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  }, [search, type, year]);

  const upcoming = DEMO_HOLIDAYS.filter((h) => h.is_active && h.holiday_date >= today).length;

  const columns: Column<Holiday>[] = [
    { key: "name", header: "Holiday", render: (h) => <span className="font-medium text-gray-900">{h.name}</span> },
    { key: "date", header: "Date", render: (h) => fmtDate(h.holiday_date) },
    {
      key: "day",
      header: "Day",
      render: (h) => WEEKDAY[new Date(h.holiday_date).getDay()],
    },
    {
      key: "type",
      header: "Type",
      render: (h) => <Badge tone={TYPE_TONE[h.holiday_type]}>{titleCase(h.holiday_type)}</Badge>,
    },
    { key: "applies", header: "Applies To", render: (h) => h.applies_to },
    {
      key: "state",
      header: "State",
      render: (h) => (
        <Badge tone={h.holiday_date >= today ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
          {h.holiday_date >= today ? "Upcoming" : "Past"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (h) => (
        <Button variant="ghost" onClick={() => toast.success(`${h.name} opened`)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <SettingsPage
      title="Holiday Calendar"
      description="Holidays mark the day register as non-working, so they must be set before the attendance cron runs for that date."
      actions={
        <>
          <Button icon={Upload}>Import</Button>
          <Button icon={Plus} variant="primary" onClick={() => setAddOpen(true)}>
            Add Holiday
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Holidays This Year" value={rows.length} />
          <StatCard label="Upcoming" value={upcoming} tint="bg-green-50 text-green-600" />
          <StatCard
            label="Restricted"
            value={DEMO_HOLIDAYS.filter((h) => h.holiday_type === "restricted").length}
            tint="bg-amber-50 text-amber-600"
          />
        </div>

        <Card title="Holidays" bodyClassName="p-4">
          <Toolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search holiday name"
            onReset={() => {
              setSearch("");
              setType("");
              setYear("2026");
            }}
            onExport={() => {}}
          >
            <SelectFilter
              label="All Years"
              value={year}
              onChange={setYear}
              options={["2025", "2026", "2027"].map((y) => ({ value: y, label: y }))}
            />
            <SelectFilter
              label="All Types"
              value={type}
              onChange={setType}
              options={["public", "regional", "restricted"].map((t) => ({
                value: t,
                label: titleCase(t),
              }))}
            />
          </Toolbar>

          <DataTable columns={columns} rows={rows} getKey={(h) => h.id} empty="No holidays for this year" dense />
        </Card>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Holiday"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success("Holiday added");
                setAddOpen(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <FormField label="Holiday Name" required>
            <Input placeholder="e.g. Ganesh Chaturthi" />
          </FormField>
          <FormField label="Date" required>
            <Input type="date" defaultValue={todayISO()} />
          </FormField>
          <FormField label="Type" required>
            <Select defaultValue="public">
              {["public", "regional", "restricted"].map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Applies To" required hint="Regional holidays scope to specific branches">
            <Select defaultValue="">
              <option value="">All branches</option>
              {DEMO_BRANCHES.map((b) => (
                <option key={b.id}>{b.name}</option>
              ))}
            </Select>
          </FormField>
        </FormGrid>
      </Modal>
    </SettingsPage>
  );
}
