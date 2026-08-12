"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ImagePlus, Info, PenLine, Plus, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  FormField,
  FormGrid,
  Input,
  Select,
  Textarea,
  Toggle,
} from "@/components/hrms/ui";
import { todayISO } from "@/lib/hrms/format";

/**
 * `docs/hrms/02-team.md §5`, with the six corrections from §6 applied:
 *
 *  1. Qualifications are a repeatable child table, not one free-text box.
 *  2. Device identifiers go to `employee_external_ids`, not columns here — so
 *     they are grouped under their own section rather than mixed into the
 *     professional details.
 *  3. `Referred By` points at an employee or an ATS candidate, not free text.
 *  4. District is a select like City, rather than the reference's mixed pair.
 *  5. `Salary Grade` and `Experience Grade` are real masters.
 *  6. `Configure Payroll` stays on the record — it is the HRMS → Payroll seam,
 *     made explicit at creation time.
 */

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const MARITAL = ["Single", "Married", "Divorced", "Widowed"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SALARY_GRADES = ["G1", "G2", "G3", "G4", "G5", "M1", "M2"];
const EXPERIENCE_GRADES = ["Fresher", "0-2 years", "2-5 years", "5-10 years", "10+ years"];
const STATES = ["Maharashtra", "Karnataka", "Delhi", "Gujarat", "Tamil Nadu"];
const CITIES: Record<string, string[]> = {
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru"],
  Delhi: ["New Delhi", "Dwarka", "Rohini"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
};

interface QualificationDraft {
  key: string;
  qualification: string;
  institute: string;
  year: string;
}

type LookupOption = {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
  business_unit_id?: string;
  status?: string;
};

type Options = {
  branches?: LookupOption[];
  departments?: LookupOption[];
  designations?: LookupOption[];
  function_roles?: LookupOption[];
  employment_types?: LookupOption[];
  shifts?: LookupOption[];
  employees?: LookupOption[];
};

export default function AddEmployeePage() {
  const router = useRouter();
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [configurePayroll, setConfigurePayroll] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState(todayISO());
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [subDepartmentId, setSubDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [functionRoleId, setFunctionRoleId] = useState("");
  const [employmentTypeId, setEmploymentTypeId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [reportingManagerId, setReportingManagerId] = useState("");
  const [assistantManagerId, setAssistantManagerId] = useState("");
  const [buddyId, setBuddyId] = useState("");
  const [options, setOptions] = useState<Options>({});
  const [saving, setSaving] = useState(false);
  const [qualifications, setQualifications] = useState<QualificationDraft[]>([
    { key: "q1", qualification: "", institute: "", year: "" },
  ]);

  useEffect(() => {
    fetch("/api/hrms/options")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Unable to load HRMS options");
        setOptions(json.data ?? {});
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load HRMS options"));
  }, []);

  const valid = firstName.trim() && lastName.trim() && workEmail.trim();

  async function save() {
    if (!valid) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hrms/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          employee_code: employeeCode,
          work_email: workEmail,
          gender,
          date_of_birth: dateOfBirth,
          blood_group: bloodGroup,
          marital_status: maritalStatus,
          personal_email: personalEmail,
          mobile,
          current_address: currentAddress,
          date_of_joining: dateOfJoining,
          branch_id: branchId,
          department_id: subDepartmentId || departmentId,
          designation_id: designationId,
          function_role_id: functionRoleId,
          employment_type_id: employmentTypeId,
          shift_id: shiftId,
          reporting_manager_id: reportingManagerId,
          assistant_manager_id: assistantManagerId,
          buddy_id: buddyId,
          payroll_enabled: configurePayroll,
          custom_fields: {
            country,
            state,
            city,
            qualifications: qualifications.filter((q) => q.qualification || q.institute || q.year),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Employee create failed");
        return;
      }
      toast.success("Employee created");
      router.push(`/hrms/team/directory/${json.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Employee create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card title="Personal Information">
        <FormGrid columns={3}>
          <FormField label="First Name" required>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </FormField>
          <FormField label="Middle Name">
            <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
          </FormField>
          <FormField label="Last Name" required>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </FormField>
          <FormField label="Gender" required hint="Nullable in practice — the directory shows an Unspecified slice">
            <Select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Select</option>
              {GENDERS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date Of Birth" required>
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </FormField>
          <FormField label="Blood Group">
            <Select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Father's Name">
            <Input />
          </FormField>
          <FormField label="Mother's Name">
            <Input />
          </FormField>
          <FormField label="Marital Status">
            <Select value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)}>
              <option value="">Select</option>
              {MARITAL.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Personal Mail ID" required hint="Distinct from the work email below">
            <Input type="email" placeholder="name@gmail.com" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} />
          </FormField>
          <FormField label="Personal Phone No" required>
            <div className="flex gap-2">
              <Select defaultValue="+91" className="w-24">
                <option>+91</option>
                <option>+971</option>
                <option>+1</option>
              </Select>
              <Input type="tel" placeholder="10-digit mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
          </FormField>
          <FormField label="Hobbies">
            <Input placeholder="Optional" />
          </FormField>
          <FormField label="Address" span>
            <Textarea placeholder="Current residential address" value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} />
          </FormField>
        </FormGrid>
      </Card>

      <Card
        title="Qualifications"
        subtitle="A repeatable table, so degree, institute and year stay separable"
        bodyClassName="p-4"
        actions={
          <Button
            icon={Plus}
            onClick={() =>
              setQualifications((prev) => [
                ...prev,
                { key: Math.random().toString(36).slice(2), qualification: "", institute: "", year: "" },
              ])
            }
          >
            Add Qualification
          </Button>
        }
      >
        <div className="space-y-3">
          {qualifications.map((q, i) => (
            <div key={q.key} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_120px_auto]">
              <Input
                placeholder="Qualification"
                value={q.qualification}
                onChange={(e) =>
                  setQualifications((prev) =>
                    prev.map((x) => (x.key === q.key ? { ...x, qualification: e.target.value } : x))
                  )
                }
              />
              <Input
                placeholder="Institute"
                value={q.institute}
                onChange={(e) =>
                  setQualifications((prev) =>
                    prev.map((x) => (x.key === q.key ? { ...x, institute: e.target.value } : x))
                  )
                }
              />
              <Input
                placeholder="Year"
                inputMode="numeric"
                value={q.year}
                onChange={(e) =>
                  setQualifications((prev) =>
                    prev.map((x) => (x.key === q.key ? { ...x, year: e.target.value } : x))
                  )
                }
              />
              <button
                type="button"
                aria-label={`Remove qualification ${i + 1}`}
                disabled={qualifications.length === 1}
                onClick={() => setQualifications((prev) => prev.filter((x) => x.key !== q.key))}
                className="rounded p-2 text-gray-400 hover:text-red-600 disabled:opacity-40"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Professional Details">
        <FormGrid columns={3}>
          <FormField label="Employee Code" hint="Leave blank to auto-generate">
            <Input placeholder="Auto-generated" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} />
          </FormField>
          <FormField label="Email" required hint="Work email — becomes the login">
            <Input type="email" value={workEmail} onChange={(e) => setWorkEmail(e.target.value)} />
          </FormField>
          <FormField label="Date of Joining" required>
            <Input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} />
          </FormField>

          <FormField label="Branch" required>
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Select</option>
              {(options.branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Department" required>
            <Select value={departmentId} onChange={(e) => {
              setDepartmentId(e.target.value);
              setSubDepartmentId("");
            }}>
              <option value="">Select</option>
              {(options.departments ?? []).filter((d) => !d.parent_id).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Sub-Department">
            <Select value={subDepartmentId} onChange={(e) => setSubDepartmentId(e.target.value)}>
              <option value="">Select</option>
              {(options.departments ?? [])
                .filter((d) => d.parent_id && (!departmentId || d.parent_id === departmentId))
                .map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Designation" required>
            <Select value={designationId} onChange={(e) => setDesignationId(e.target.value)}>
              <option value="">Select</option>
              {(options.designations ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Function Role" hint="What the person does, independent of their title">
            <Select value={functionRoleId} onChange={(e) => setFunctionRoleId(e.target.value)}>
              <option value="">Select</option>
              {(options.function_roles ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Employee Type" required>
            <Select value={employmentTypeId} onChange={(e) => setEmploymentTypeId(e.target.value)}>
              <option value="">Select</option>
              {(options.employment_types ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Salary Grade">
            <Select defaultValue="">
              <option value="">Select</option>
              {SALARY_GRADES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Experience Grade">
            <Select defaultValue="">
              <option value="">Select</option>
              {EXPERIENCE_GRADES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Experience" required hint="Total prior experience in years">
            <Input type="number" min={0} step={0.5} placeholder="In years" />
          </FormField>

          <FormField label="Reporting Manager" required>
            <Select value={reportingManagerId} onChange={(e) => setReportingManagerId(e.target.value)}>
              <option value="">Select</option>
              {(options.employees ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Asst. Reporting Manager"
            hint="The fallback approver when the primary is unavailable"
          >
            <Select value={assistantManagerId} onChange={(e) => setAssistantManagerId(e.target.value)}>
              <option value="">Select</option>
              {(options.employees ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Buddy" hint="Onboarding mentor">
            <Select value={buddyId} onChange={(e) => setBuddyId(e.target.value)}>
              <option value="">Select</option>
              {(options.employees ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Default Shift">
            <Select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
              <option value="">Select</option>
              {(options.shifts ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Referred By"
            hint="Resolves to an employee or an ATS candidate, so a referral bonus stays payable"
          >
            <Select defaultValue="">
              <option value="">Not referred</option>
              {(options.employees ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Appraisal Template">
            <Select defaultValue="">
              <option value="">Select</option>
              <option>Annual Review — Individual Contributor</option>
              <option>Annual Review — People Manager</option>
              <option>Probation Confirmation</option>
            </Select>
          </FormField>
        </FormGrid>
      </Card>

      <Card title="Address">
        <FormGrid columns={3}>
          <FormField label="Country" required>
            <Select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setState("");
                setCity("");
              }}
            >
              <option>India</option>
              <option>United Arab Emirates</option>
            </Select>
          </FormField>
          <FormField label="State" required hint="Cascades from country">
            <Select
              value={state}
              disabled={!country}
              onChange={(e) => {
                setState(e.target.value);
                setCity("");
              }}
            >
              <option value="">Select</option>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="District" hint="A select, matching City — the reference had one of each">
            <Select defaultValue="" disabled={!state}>
              <option value="">Select</option>
              {(CITIES[state] ?? []).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="City / Village" required hint="Cascades from state">
            <Select value={city} disabled={!state} onChange={(e) => setCity(e.target.value)}>
              <option value="">Select</option>
              {(CITIES[state] ?? []).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Pin Code" required>
            <Input inputMode="numeric" maxLength={6} placeholder="400050" />
          </FormField>
        </FormGrid>
      </Card>

      <Card
        title="Device Identifiers"
        subtitle="Stored as external ids, so a new attendance vendor never adds a column to employees"
      >
        <FormGrid columns={3}>
          <FormField label="Punching Employee Code" hint="The id the biometric device knows this person by">
            <Input placeholder="e.g. 1042" />
          </FormField>
          <FormField label="Biomax Employee Email" hint="Biomax device account">
            <Input type="email" placeholder="name@device.local" />
          </FormField>
          <FormField label="Face Identity Enrolled" hint="Captured separately under Settings → Face Identity Vault">
            <Input value="Not enrolled" disabled />
          </FormField>
        </FormGrid>
      </Card>

      <Card title="Payroll & Uploads">
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <Info size={15} className="mt-0.5 flex-shrink-0 text-brand-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-brand-900">Configure Payroll</p>
            <p className="text-xs text-brand-700">
              Enrols this employee in the payroll product when it goes live. Attendance,
              leave and reimbursement all flow through this flag.
            </p>
          </div>
          <Toggle checked={configurePayroll} onChange={setConfigurePayroll} label="Configure Payroll" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600"
          >
            <ImagePlus size={20} />
            Upload Image
          </button>
          <button
            type="button"
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600"
          >
            <PenLine size={20} />
            Upload Signature
          </button>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button onClick={() => router.push("/hrms/team/directory")}>Cancel</Button>
          <Button variant="primary" disabled={!valid || saving} onClick={save}>
            {saving ? "Saving..." : "Save Employee"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
