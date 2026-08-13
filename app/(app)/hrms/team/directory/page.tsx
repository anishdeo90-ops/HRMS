"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Download, KeyRound, Mail, Plus, Trophy, Upload, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  SelectFilter,
  SubTabs,
  Toolbar,
  type Column,
} from "@/components/hrms/ui";
import { EMPTY, fmtDate, initials } from "@/lib/hrms/format";
import { employeeTone, titleCase } from "@/lib/hrms/status";
import type { Employee } from "@/lib/hrms/types";

type LookupOption = { id: string; name: string };
type Options = {
  departments?: LookupOption[];
  designations?: LookupOption[];
  employment_types?: LookupOption[];
};

/**
 * `docs/hrms/02-team.md §2`.
 *
 * `Ex Employee` is a separate view rather than a filter chip, because exits are
 * soft-archived and excluded from the default list — never hard-deleted.
 */
export default function EmployeeDirectoryPage() {
  const router = useRouter();
  const [view, setView] = useState<"current" | "ex">("current");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [type, setType] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [options, setOptions] = useState<Options>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const [employeeRes, optionRes] = await Promise.all([
        fetch("/api/hrms/employees"),
        fetch("/api/hrms/options"),
      ]);
      const employeeJson = await employeeRes.json();
      const optionJson = await optionRes.json();
      if (!employeeRes.ok) throw new Error(employeeJson.error ?? "Unable to load employees");
      if (!optionRes.ok) throw new Error(optionJson.error ?? "Unable to load HRMS options");
      if (alive) {
        setEmployees(employeeJson.data ?? []);
        setOptions(optionJson.data ?? {});
      }
    }
    load()
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load employees"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    const base = employees.filter((e) =>
      view === "ex" ? e.status === "separated" : e.status !== "separated"
    );
    const q = search.trim().toLowerCase();
    return base.filter((e) => {
      if (department && e.department !== department) return false;
      if (designation && e.designation !== designation) return false;
      if (type && e.employment_type !== type) return false;
      if (!q) return true;
      return [e.name, e.employee_code, e.email, e.designation, e.department].some((f) =>
        String(f ?? "").toLowerCase().includes(q)
      );
    });
  }, [employees, view, search, department, designation, type]);

  const hasSelection = selected.length > 0;

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: "Name",
      render: (e) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
            {initials(e.name)}
          </span>
          <div>
            <p className="font-medium text-gray-900">{e.name}</p>
            <p className="text-xs text-gray-500">{e.email}</p>
          </div>
        </div>
      ),
    },
    { key: "code", header: "EMP Code", render: (e) => e.employee_code },
    { key: "doj", header: "Joining Date", render: (e) => fmtDate(e.date_of_joining) },
    { key: "manager", header: "Reporting Manager", render: (e) => e.reporting_manager ?? EMPTY },
    { key: "designation", header: "Designation", render: (e) => e.designation ?? EMPTY },
    { key: "department", header: "Department", render: (e) => e.department ?? EMPTY },
    { key: "branch", header: "Branch", render: (e) => e.branch ?? EMPTY },
    { key: "type", header: "Type", render: (e) => e.employment_type ?? EMPTY },
    {
      key: "status",
      header: "Status",
      render: (e) => <Badge tone={employeeTone(e.status)}>{titleCase(e.status)}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (e) => (
        <Button
          variant="ghost"
          onClick={(ev) => {
            ev.stopPropagation();
            router.push(`/hrms/team/directory/${e.id}`);
          }}
        >
          Open
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Employee Directory"
      subtitle={loading ? "Loading employees..." : `${rows.length} of ${employees.length} employees`}
      bodyClassName="p-4"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/hrms/performance/reports">
            <Button icon={Trophy}>Employee Ranking</Button>
          </Link>
          <Link href="/hrms/performance/reports">
            <Button icon={Users}>Team Ranking</Button>
          </Link>
          <Link href="/hrms/team/directory/add">
            <Button icon={Plus} variant="primary">
              Add Employee
            </Button>
          </Link>
        </div>
      }
    >
      <SubTabs
        tabs={[
          { key: "current", label: "Current Employees", count: employees.filter((e) => e.status !== "separated").length },
          { key: "ex", label: "Ex Employees", count: employees.filter((e) => e.status === "separated").length },
        ]}
        value={view}
        onChange={(v) => {
          setView(v);
          setSelected([]);
        }}
      />

      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search name, code, email or designation"
        onReset={() => {
          setSearch("");
          setDepartment("");
          setDesignation("");
          setType("");
        }}
        onExport={() => {}}
      >
        <SelectFilter
          label="All Departments"
          value={department}
          onChange={setDepartment}
          options={(options.departments ?? []).map((d) => ({ value: d.name, label: d.name }))}
        />
        <SelectFilter
          label="All Designations"
          value={designation}
          onChange={setDesignation}
          options={(options.designations ?? []).map((d) => ({ value: d.name, label: d.name }))}
        />
        <SelectFilter
          label="All Types"
          value={type}
          onChange={setType}
          options={(options.employment_types ?? []).map((d) => ({ value: d.name, label: d.name }))}
        />
        <Button icon={Upload}>Import</Button>
      </Toolbar>

      {/* Bulk actions stay disabled until rows are selected. */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <span className="text-xs font-medium text-gray-500">
          {hasSelection ? `${selected.length} selected` : "Select rows for bulk actions"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            icon={Mail}
            disabled
            title="Exit formalities email workflow is not part of Task 1 API"
          >
            Send Exit Formalities Email
          </Button>
          <Button
            icon={KeyRound}
            disabled
            title="Password change email workflow is not part of Task 1 API"
          >
            Send Password Change Email
          </Button>
          <Button icon={Download} disabled={!hasSelection}>
            Export Selected
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getKey={(e) => e.id}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        onRowClick={(e) => router.push(`/hrms/team/directory/${e.id}`)}
        empty={view === "ex" ? "No ex-employees" : "No employees match these filters"}
        dense
      />
    </Card>
  );
}
