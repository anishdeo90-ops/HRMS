/**
 * Demo data — the seam the backend replaces.
 *
 * Every screen in the HRMS reads from here so the UI can be reviewed with real
 * shapes before `/api/hrms/*` exists. The shapes are the ones in `types.ts`, so
 * swapping a `DEMO_*` constant for a fetch should not change a single component.
 *
 * Codex: replace these exports one module at a time. Nothing else imports the
 * data directly — pages import from this file only.
 */

import type {
  Announcement,
  Appraisal,
  AppraisalTemplate,
  ApprovalRequest,
  Asset,
  AttendanceDay,
  BusinessUnit,
  CronJob,
  DocumentTypeMaster,
  EmailTemplateMaster,
  Employee,
  EmployeeDocument,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeFamilyMember,
  ExpenseClaim,
  Goal,
  Holiday,
  JobOpeningView,
  Kra,
  LeaveBalance,
  LeaveType,
  LookupItem,
  OnboardingCase,
  OnboardingFormMaster,
  PerformanceCycle,
  RankingEntry,
  RoleDefinition,
  Separation,
  Shift,
  Ticket,
  ActivityLogEntry,
} from "./types";

/* ── date helpers so the demo always looks current ─────────────── */

const NOW = new Date();

function iso(daysFromToday: number, hour?: number, minute = 0): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysFromToday);
  if (hour != null) d.setHours(hour, minute, 0, 0);
  else d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function day(daysFromToday: number): string {
  return iso(daysFromToday).slice(0, 10);
}

/** Lacs → paise, because every money field is an integer. */
const lacs = (n: number) => Math.round(n * 100000 * 100);
const rupees = (n: number) => Math.round(n * 100);

/* ── Org lookups ───────────────────────────────────────────────── */

export const DEMO_BRANCHES: LookupItem[] = [
  { id: "br-1", name: "Mumbai — Andheri East", code: "MUM", is_active: true, employee_count: 74 },
  { id: "br-2", name: "Pune — Hinjewadi", code: "PUN", is_active: true, employee_count: 38 },
  { id: "br-3", name: "Bengaluru — Whitefield", code: "BLR", is_active: true, employee_count: 26 },
  { id: "br-4", name: "Delhi NCR — Gurugram", code: "DEL", is_active: false, employee_count: 0 },
];

export const DEMO_BUSINESS_UNITS: BusinessUnit[] = [
  { id: "bu-1", name: "Facility Services", code: "FS", is_active: true, head_employee_id: "e-2", head_name: "Rohit Deshmukh", employee_count: 68 },
  { id: "bu-2", name: "Staffing Solutions", code: "SS", is_active: true, head_employee_id: "e-5", head_name: "Kavya Iyer", employee_count: 51 },
  { id: "bu-3", name: "Corporate", code: "CORP", is_active: true, head_employee_id: "e-1", head_name: "Anish Trivedi", employee_count: 19 },
];

export const DEMO_DEPARTMENTS: LookupItem[] = [
  { id: "dp-1", name: "Operations", code: "OPS", is_active: true, parent_id: "bu-1", parent_name: "Facility Services", employee_count: 44 },
  { id: "dp-2", name: "Human Resources", code: "HR", is_active: true, parent_id: "bu-3", parent_name: "Corporate", employee_count: 9 },
  { id: "dp-3", name: "Finance & Accounts", code: "FIN", is_active: true, parent_id: "bu-3", parent_name: "Corporate", employee_count: 6 },
  { id: "dp-4", name: "Recruitment", code: "REC", is_active: true, parent_id: "bu-2", parent_name: "Staffing Solutions", employee_count: 22 },
  { id: "dp-5", name: "Technology", code: "TECH", is_active: true, parent_id: "bu-3", parent_name: "Corporate", employee_count: 12 },
  { id: "dp-6", name: "Client Servicing", code: "CS", is_active: true, parent_id: "bu-2", parent_name: "Staffing Solutions", employee_count: 15 },
];

export const DEMO_SUB_DEPARTMENTS: LookupItem[] = [
  { id: "sd-1", name: "Housekeeping", is_active: true, parent_id: "dp-1", parent_name: "Operations", employee_count: 26 },
  { id: "sd-2", name: "Security", is_active: true, parent_id: "dp-1", parent_name: "Operations", employee_count: 18 },
  { id: "sd-3", name: "Talent Acquisition", is_active: true, parent_id: "dp-4", parent_name: "Recruitment", employee_count: 14 },
  { id: "sd-4", name: "Payroll & Compliance", is_active: true, parent_id: "dp-2", parent_name: "Human Resources", employee_count: 4 },
  { id: "sd-5", name: "Product Engineering", is_active: true, parent_id: "dp-5", parent_name: "Technology", employee_count: 8 },
];

export const DEMO_DESIGNATIONS: LookupItem[] = [
  { id: "dg-1", name: "Chief Executive Officer", code: "CEO", is_active: true, employee_count: 1 },
  { id: "dg-2", name: "Operations Manager", code: "OM", is_active: true, employee_count: 5 },
  { id: "dg-3", name: "HR Manager", code: "HRM", is_active: true, employee_count: 3 },
  { id: "dg-4", name: "Senior Recruiter", code: "SRC", is_active: true, employee_count: 8 },
  { id: "dg-5", name: "Recruiter", code: "REC", is_active: true, employee_count: 14 },
  { id: "dg-6", name: "Software Engineer", code: "SWE", is_active: true, employee_count: 8 },
  { id: "dg-7", name: "Accounts Executive", code: "AE", is_active: true, employee_count: 4 },
  { id: "dg-8", name: "Housekeeping Supervisor", code: "HKS", is_active: true, employee_count: 6 },
];

export const DEMO_EMPLOYMENT_TYPES: LookupItem[] = [
  { id: "et-1", name: "Permanent", code: "PERM", is_active: true, employee_count: 96 },
  { id: "et-2", name: "Contract", code: "CTR", is_active: true, employee_count: 31 },
  { id: "et-3", name: "Intern", code: "INT", is_active: true, employee_count: 7 },
  { id: "et-4", name: "Consultant", code: "CON", is_active: true, employee_count: 4 },
];

export const DEMO_FUNCTION_ROLES: LookupItem[] = [
  { id: "fr-1", name: "Individual Contributor", is_active: true, description: "No direct reports", employee_count: 104 },
  { id: "fr-2", name: "People Manager", is_active: true, description: "Approves leave and attendance for direct reports", employee_count: 22 },
  { id: "fr-3", name: "Business Head", is_active: true, description: "Resolves approver_source = business_head", employee_count: 3 },
  { id: "fr-4", name: "HR Administrator", is_active: true, description: "Full people-data access", employee_count: 5 },
];

export const DEMO_ANNOUNCEMENT_CATEGORIES: LookupItem[] = [
  { id: "ac-1", name: "Policy", is_active: true },
  { id: "ac-2", name: "Celebration", is_active: true },
  { id: "ac-3", name: "IT & Facilities", is_active: true },
  { id: "ac-4", name: "Compliance", is_active: true },
];

export const DEMO_EXPENSE_TYPES: LookupItem[] = [
  { id: "ex-1", name: "Travel — Local", is_active: true },
  { id: "ex-2", name: "Travel — Outstation", is_active: true },
  { id: "ex-3", name: "Client Entertainment", is_active: true },
  { id: "ex-4", name: "Internet & Telephone", is_active: true },
  { id: "ex-5", name: "Office Supplies", is_active: true },
];

export const DEMO_TICKET_CATEGORIES: LookupItem[] = [
  { id: "tc-1", name: "IT Support", is_active: true },
  { id: "tc-2", name: "Payroll Query", is_active: true },
  { id: "tc-3", name: "Attendance Correction", is_active: true },
  { id: "tc-4", name: "Facilities", is_active: true },
  { id: "tc-5", name: "Document Request", is_active: true },
];

/* ── Employees ─────────────────────────────────────────────────── */

export const DEMO_EMPLOYEES: Employee[] = [
  {
    id: "e-1", employee_code: "HR-0001", name: "Anish Trivedi", email: "anish@hirerabbits.ai", mobile: "9820011223",
    designation: "Chief Executive Officer", department: "Technology", sub_department: "Product Engineering",
    business_unit: "Corporate", branch: "Mumbai — Andheri East", employment_type: "Permanent",
    function_role: "Business Head", date_of_joining: "2019-04-01", confirmation_date: "2019-07-01",
    status: "active", date_of_birth: "1988-11-14", gender: "Male", blood_group: "O+", marital_status: "Married",
    nationality: "Indian", personal_email: "anish.personal@gmail.com", emergency_contact_name: "Meera Trivedi",
    emergency_contact_relation: "Spouse", emergency_contact_number: "9820044556",
    current_address: "12 Sea Breeze, Bandra West, Mumbai 400050", permanent_address: "12 Sea Breeze, Bandra West, Mumbai 400050",
    pan: "ABCPT1234K", aadhaar_last4: "8842", uan: "100234567890", bank_name: "HDFC Bank",
    bank_account_last4: "6721", ifsc: "HDFC0000123", shift_name: "General Shift", work_location: "Mumbai HQ",
    attendance_mode: "working_hours_only", ctc_annual_paise: lacs(48),
  },
  {
    id: "e-2", employee_code: "HR-0002", name: "Rohit Deshmukh", email: "rohit.d@hirerabbits.ai", mobile: "9930022113",
    designation: "Operations Manager", department: "Operations", sub_department: "Housekeeping",
    business_unit: "Facility Services", branch: "Mumbai — Andheri East", employment_type: "Permanent",
    function_role: "Business Head", reporting_manager_id: "e-1", reporting_manager: "Anish Trivedi",
    date_of_joining: "2020-06-15", confirmation_date: "2020-09-15", status: "active",
    date_of_birth: "1985-03-22", gender: "Male", blood_group: "B+", marital_status: "Married", nationality: "Indian",
    emergency_contact_name: "Sunita Deshmukh", emergency_contact_relation: "Spouse", emergency_contact_number: "9930099887",
    current_address: "402 Sai Residency, Powai, Mumbai 400076",
    pan: "BXTPD9821L", aadhaar_last4: "2210", uan: "100234511111", bank_name: "ICICI Bank",
    bank_account_last4: "1188", ifsc: "ICIC0004421", shift_name: "General Shift", work_location: "Mumbai HQ",
    attendance_mode: "working_hours_only", ctc_annual_paise: lacs(18.5),
  },
  {
    id: "e-3", employee_code: "HR-0003", name: "Priya Nair", email: "priya.nair@hirerabbits.ai", mobile: "9821133445",
    designation: "HR Manager", department: "Human Resources", sub_department: "Payroll & Compliance",
    business_unit: "Corporate", branch: "Mumbai — Andheri East", employment_type: "Permanent",
    function_role: "HR Administrator", reporting_manager_id: "e-1", reporting_manager: "Anish Trivedi",
    date_of_joining: "2021-02-01", confirmation_date: "2021-05-01", status: "active",
    date_of_birth: "1991-07-09", gender: "Female", blood_group: "A+", marital_status: "Single", nationality: "Indian",
    emergency_contact_name: "Latha Nair", emergency_contact_relation: "Mother", emergency_contact_number: "9821199001",
    current_address: "7B Green Acres, Chembur, Mumbai 400071",
    pan: "CDFPN4412M", aadhaar_last4: "7734", uan: "100234522222", bank_name: "Axis Bank",
    bank_account_last4: "9043", ifsc: "UTIB0001234", shift_name: "General Shift", work_location: "Mumbai HQ",
    attendance_mode: "working_hours_only", ctc_annual_paise: lacs(14),
  },
  {
    id: "e-4", employee_code: "HR-0004", name: "Sameer Khan", email: "sameer.k@hirerabbits.ai", mobile: "9004455662",
    designation: "Senior Recruiter", department: "Recruitment", sub_department: "Talent Acquisition",
    business_unit: "Staffing Solutions", branch: "Pune — Hinjewadi", employment_type: "Permanent",
    function_role: "People Manager", reporting_manager_id: "e-5", reporting_manager: "Kavya Iyer",
    date_of_joining: "2022-08-01", confirmation_date: "2022-11-01", status: "active",
    date_of_birth: "1993-01-30", gender: "Male", blood_group: "AB+", marital_status: "Married", nationality: "Indian",
    emergency_contact_name: "Farah Khan", emergency_contact_relation: "Spouse", emergency_contact_number: "9004400111",
    current_address: "Flat 9, Blue Ridge, Hinjewadi, Pune 411057",
    pan: "DEFPK7781N", aadhaar_last4: "5567", uan: "100234533333", bank_name: "Kotak Mahindra Bank",
    bank_account_last4: "3320", ifsc: "KKBK0000456", shift_name: "General Shift", work_location: "Pune Office",
    attendance_mode: "strict_shift_timing", ctc_annual_paise: lacs(9.5),
  },
  {
    id: "e-5", employee_code: "HR-0005", name: "Kavya Iyer", email: "kavya.i@hirerabbits.ai", mobile: "9769988771",
    designation: "Operations Manager", department: "Recruitment", sub_department: "Talent Acquisition",
    business_unit: "Staffing Solutions", branch: "Mumbai — Andheri East", employment_type: "Permanent",
    function_role: "Business Head", reporting_manager_id: "e-1", reporting_manager: "Anish Trivedi",
    date_of_joining: "2020-11-10", confirmation_date: "2021-02-10", status: "active",
    date_of_birth: "1989-05-18", gender: "Female", blood_group: "O-", marital_status: "Married", nationality: "Indian",
    emergency_contact_name: "Raghav Iyer", emergency_contact_relation: "Spouse", emergency_contact_number: "9769900222",
    current_address: "1204 Oberoi Splendor, Jogeshwari, Mumbai 400060",
    pan: "EFGPI3390P", aadhaar_last4: "1129", uan: "100234544444", bank_name: "HDFC Bank",
    bank_account_last4: "7754", ifsc: "HDFC0000123", shift_name: "General Shift", work_location: "Mumbai HQ",
    attendance_mode: "working_hours_only", ctc_annual_paise: lacs(21),
  },
  {
    id: "e-6", employee_code: "HR-0006", name: "Aditya Rane", email: "aditya.r@hirerabbits.ai", mobile: "9987766554",
    designation: "Software Engineer", department: "Technology", sub_department: "Product Engineering",
    business_unit: "Corporate", branch: "Bengaluru — Whitefield", employment_type: "Permanent",
    function_role: "Individual Contributor", reporting_manager_id: "e-1", reporting_manager: "Anish Trivedi",
    date_of_joining: day(-95), probation_end_date: day(-5), status: "active",
    date_of_birth: "1996-09-25", gender: "Male", blood_group: "B-", marital_status: "Single", nationality: "Indian",
    emergency_contact_name: "Vikas Rane", emergency_contact_relation: "Father", emergency_contact_number: "9987700998",
    current_address: "302 Prestige Sunrise, Whitefield, Bengaluru 560066",
    pan: "FGHPR2245Q", aadhaar_last4: "3391", uan: "100234555555", bank_name: "ICICI Bank",
    bank_account_last4: "2298", ifsc: "ICIC0004421", shift_name: "General Shift", work_location: "Bengaluru Office",
    attendance_mode: "working_hours_only", ctc_annual_paise: lacs(12), source_candidate_id: "cand-8841",
  },
  {
    id: "e-7", employee_code: "HR-0007", name: "Neha Bhatt", email: "neha.b@hirerabbits.ai", mobile: "9930112244",
    designation: "Recruiter", department: "Recruitment", sub_department: "Talent Acquisition",
    business_unit: "Staffing Solutions", branch: "Pune — Hinjewadi", employment_type: "Permanent",
    function_role: "Individual Contributor", reporting_manager_id: "e-4", reporting_manager: "Sameer Khan",
    date_of_joining: day(-42), probation_end_date: day(48), status: "probation",
    date_of_birth: "1998-12-03", gender: "Female", blood_group: "A-", marital_status: "Single", nationality: "Indian",
    emergency_contact_name: "Rakesh Bhatt", emergency_contact_relation: "Father", emergency_contact_number: "9930100333",
    current_address: "14 Shivaji Nagar, Pune 411005",
    pan: "GHIPB8834R", aadhaar_last4: "9012", bank_name: "State Bank of India",
    bank_account_last4: "5510", ifsc: "SBIN0011223", shift_name: "General Shift", work_location: "Pune Office",
    attendance_mode: "strict_shift_timing", ctc_annual_paise: lacs(5.4), source_candidate_id: "cand-9013",
  },
  {
    id: "e-8", employee_code: "HR-0008", name: "Farhan Sheikh", email: "farhan.s@hirerabbits.ai", mobile: "9820556677",
    designation: "Housekeeping Supervisor", department: "Operations", sub_department: "Housekeeping",
    business_unit: "Facility Services", branch: "Mumbai — Andheri East", employment_type: "Contract",
    function_role: "People Manager", reporting_manager_id: "e-2", reporting_manager: "Rohit Deshmukh",
    date_of_joining: "2023-03-20", confirmation_date: "2023-06-20", status: "active",
    date_of_birth: "1990-04-11", gender: "Male", blood_group: "O+", marital_status: "Married", nationality: "Indian",
    emergency_contact_name: "Nazia Sheikh", emergency_contact_relation: "Spouse", emergency_contact_number: "9820500444",
    current_address: "Room 8, Sai Chawl, Kurla, Mumbai 400070",
    pan: "HIJPS1156S", aadhaar_last4: "4478", uan: "100234566666", esic_number: "3100223344",
    bank_name: "Bank of Baroda", bank_account_last4: "8801", ifsc: "BARB0MUMBAI",
    shift_name: "Morning Shift", work_location: "Client Site — Powai", attendance_mode: "strict_shift_timing",
    ctc_annual_paise: lacs(4.2),
  },
  {
    id: "e-9", employee_code: "HR-0009", name: "Sneha Kulkarni", email: "sneha.k@hirerabbits.ai", mobile: "9762233445",
    designation: "Accounts Executive", department: "Finance & Accounts", business_unit: "Corporate",
    branch: "Pune — Hinjewadi", employment_type: "Permanent", function_role: "Individual Contributor",
    reporting_manager_id: "e-3", reporting_manager: "Priya Nair",
    date_of_joining: "2022-01-17", confirmation_date: "2022-04-17", status: "notice",
    date_of_birth: "1994-08-08", gender: "Female", blood_group: "B+", marital_status: "Single", nationality: "Indian",
    emergency_contact_name: "Manisha Kulkarni", emergency_contact_relation: "Mother", emergency_contact_number: "9762200111",
    current_address: "22 Kothrud, Pune 411038",
    pan: "IJKPK6690T", aadhaar_last4: "6623", uan: "100234577777", bank_name: "Axis Bank",
    bank_account_last4: "4432", ifsc: "UTIB0001234", shift_name: "General Shift", work_location: "Pune Office",
    attendance_mode: "working_hours_only", ctc_annual_paise: lacs(6.8),
  },
  {
    id: "e-10", employee_code: "HR-0010", name: "Vikram Malhotra", email: "vikram.m@hirerabbits.ai", mobile: "9811223366",
    designation: "Senior Recruiter", department: "Client Servicing", business_unit: "Staffing Solutions",
    branch: "Bengaluru — Whitefield", employment_type: "Permanent", function_role: "Individual Contributor",
    reporting_manager_id: "e-5", reporting_manager: "Kavya Iyer",
    date_of_joining: "2021-09-06", confirmation_date: "2021-12-06", status: "active",
    date_of_birth: "1992-02-14", gender: "Male", blood_group: "A+", marital_status: "Married", nationality: "Indian",
    emergency_contact_name: "Ritu Malhotra", emergency_contact_relation: "Spouse", emergency_contact_number: "9811200777",
    current_address: "Villa 6, Palm Meadows, Whitefield, Bengaluru 560066",
    pan: "JKLPM4478U", aadhaar_last4: "8890", uan: "100234588888", bank_name: "HDFC Bank",
    bank_account_last4: "1177", ifsc: "HDFC0000123", shift_name: "General Shift", work_location: "Bengaluru Office",
    attendance_mode: "working_hours_only", ctc_annual_paise: lacs(11.2),
  },
  {
    id: "e-11", employee_code: "HR-0011", name: "Ritu Sharma", email: "ritu.s@hirerabbits.ai", mobile: "9873344556",
    designation: "Recruiter", department: "Recruitment", sub_department: "Talent Acquisition",
    business_unit: "Staffing Solutions", branch: "Mumbai — Andheri East", employment_type: "Intern",
    function_role: "Individual Contributor", reporting_manager_id: "e-4", reporting_manager: "Sameer Khan",
    date_of_joining: day(-21), probation_end_date: day(69), status: "probation",
    date_of_birth: "2001-06-19", gender: "Female", nationality: "Indian",
    emergency_contact_name: "Anil Sharma", emergency_contact_relation: "Father", emergency_contact_number: "9873300222",
    current_address: "5 Vile Parle East, Mumbai 400057",
    shift_name: "General Shift", work_location: "Mumbai HQ", attendance_mode: "working_hours_only",
    ctc_annual_paise: lacs(3),
  },
  {
    id: "e-12", employee_code: "HR-0012", name: "Deepak Yadav", email: "deepak.y@hirerabbits.ai", mobile: "9004411778",
    designation: "Housekeeping Supervisor", department: "Operations", sub_department: "Security",
    business_unit: "Facility Services", branch: "Mumbai — Andheri East", employment_type: "Contract",
    function_role: "Individual Contributor", reporting_manager_id: "e-2", reporting_manager: "Rohit Deshmukh",
    date_of_joining: "2023-07-11", confirmation_date: "2023-10-11", status: "active",
    date_of_birth: "1987-10-02", gender: "Male", blood_group: "O+", marital_status: "Married", nationality: "Indian",
    emergency_contact_name: "Kamla Yadav", emergency_contact_relation: "Spouse", emergency_contact_number: "9004400999",
    current_address: "Sector 12, Vashi, Navi Mumbai 400703",
    pan: "KLMPY2231V", aadhaar_last4: "1145", uan: "100234599999", esic_number: "3100556677",
    bank_name: "Bank of Baroda", bank_account_last4: "3390", ifsc: "BARB0MUMBAI",
    shift_name: "Night Shift", work_location: "Client Site — BKC", attendance_mode: "strict_shift_timing",
    ctc_annual_paise: lacs(3.9),
  },
  {
    id: "e-13", employee_code: "HR-0013", name: "Ananya Ghosh", email: "ananya.g@hirerabbits.ai", mobile: "9836677889",
    designation: "Software Engineer", department: "Technology", sub_department: "Product Engineering",
    business_unit: "Corporate", branch: "Bengaluru — Whitefield", employment_type: "Permanent",
    function_role: "Individual Contributor", reporting_manager_id: "e-1", reporting_manager: "Anish Trivedi",
    date_of_joining: "2022-05-02", confirmation_date: "2022-08-02", status: "active",
    date_of_birth: "1995-03-07", gender: "Female", blood_group: "AB-", marital_status: "Single", nationality: "Indian",
    emergency_contact_name: "Subhas Ghosh", emergency_contact_relation: "Father", emergency_contact_number: "9836600111",
    current_address: "18 Indiranagar, Bengaluru 560038",
    pan: "LMNPG9987W", aadhaar_last4: "7712", uan: "100234510101", bank_name: "ICICI Bank",
    bank_account_last4: "6654", ifsc: "ICIC0004421", shift_name: "General Shift", work_location: "Bengaluru Office",
    attendance_mode: "working_hours_only", ctc_annual_paise: lacs(15.5),
  },
  {
    id: "e-14", employee_code: "HR-0014", name: "Manish Patel", email: "manish.p@hirerabbits.ai", mobile: "9825566443",
    designation: "Accounts Executive", department: "Finance & Accounts", business_unit: "Corporate",
    branch: "Mumbai — Andheri East", employment_type: "Permanent", function_role: "Individual Contributor",
    reporting_manager_id: "e-3", reporting_manager: "Priya Nair",
    date_of_joining: "2019-12-02", confirmation_date: "2020-03-02", status: "separated",
    date_of_birth: "1986-01-21", gender: "Male", blood_group: "B+", marital_status: "Married", nationality: "Indian",
    emergency_contact_name: "Hetal Patel", emergency_contact_relation: "Spouse", emergency_contact_number: "9825500332",
    current_address: "9 Ghatkopar West, Mumbai 400086",
    pan: "MNOPP5543X", aadhaar_last4: "2267", uan: "100234511212", bank_name: "State Bank of India",
    bank_account_last4: "9921", ifsc: "SBIN0011223", shift_name: "General Shift", work_location: "Mumbai HQ",
    attendance_mode: "working_hours_only", ctc_annual_paise: lacs(7.5),
  },
];

/** The signed-in employee, until session → employee resolution exists. */
export const DEMO_ME = DEMO_EMPLOYEES[2];

export const DEMO_FAMILY: EmployeeFamilyMember[] = [
  { id: "fm-1", name: "Latha Nair", relation: "Mother", date_of_birth: "1962-04-12", is_dependent: true, contact_number: "9821199001" },
  { id: "fm-2", name: "Suresh Nair", relation: "Father", date_of_birth: "1959-09-30", is_dependent: true, contact_number: "9821199002" },
  { id: "fm-3", name: "Arjun Nair", relation: "Brother", date_of_birth: "1994-02-16", is_dependent: false },
];

export const DEMO_EDUCATION: EmployeeEducation[] = [
  { id: "ed-1", qualification: "MBA", institute: "Symbiosis Institute of Business Management", specialization: "Human Resources", year_of_passing: 2015, percentage: 74 },
  { id: "ed-2", qualification: "B.Com", institute: "University of Mumbai", specialization: "Accounting & Finance", year_of_passing: 2012, percentage: 68 },
];

export const DEMO_EXPERIENCE: EmployeeExperience[] = [
  { id: "xp-1", company: "TeamLease Services", designation: "HR Executive", from_date: "2015-07-01", to_date: "2018-03-31", last_ctc_paise: lacs(4.8) },
  { id: "xp-2", company: "Quess Corp", designation: "Assistant HR Manager", from_date: "2018-04-15", to_date: "2021-01-20", last_ctc_paise: lacs(9.2) },
];

export const DEMO_EMPLOYEE_DOCUMENTS: EmployeeDocument[] = [
  { id: "doc-1", document_type: "PAN Card", file_name: "pan-priya.pdf", uploaded_at: iso(-380), status: "verified", is_mandatory: true },
  { id: "doc-2", document_type: "Aadhaar Card", file_name: "aadhaar-priya.pdf", uploaded_at: iso(-380), status: "verified", is_mandatory: true },
  { id: "doc-3", document_type: "Passport", file_name: "passport-priya.pdf", uploaded_at: iso(-200), expires_at: iso(920), status: "verified", is_mandatory: false },
  { id: "doc-4", document_type: "Relieving Letter — Quess Corp", file_name: "relieving.pdf", uploaded_at: iso(-379), status: "verified", is_mandatory: true },
  { id: "doc-5", document_type: "Degree Certificate", status: "pending", is_mandatory: true, remarks: "Original pending verification" },
  { id: "doc-6", document_type: "Form 16 — FY 2024-25", file_name: "form16.pdf", uploaded_at: iso(-95), status: "uploaded", is_mandatory: false },
];

/* ── Attendance ────────────────────────────────────────────────── */

function buildMonth(): AttendanceDay[] {
  const rows: AttendanceDay[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(NOW);
    d.setDate(d.getDate() - i);
    const weekday = d.getDay();
    const dateStr = d.toISOString().slice(0, 10);
    const base = {
      id: `att-${dateStr}`,
      employee_id: DEMO_ME.id,
      employee_name: DEMO_ME.name,
      employee_code: DEMO_ME.employee_code,
      work_date: dateStr,
      shift_name: "General Shift",
    };

    if (weekday === 0 || weekday === 6) {
      rows.push({ ...base, day_status: "weekly_off", payable_fraction: 1 });
      continue;
    }
    if (i === 11) {
      rows.push({ ...base, day_status: "holiday", payable_fraction: 1 });
      continue;
    }
    if (i === 6 || i === 5) {
      rows.push({ ...base, day_status: "on_leave", payable_fraction: 1 });
      continue;
    }
    if (i === 17) {
      rows.push({
        ...base, day_status: "half_day", payable_fraction: 0.5,
        first_in: iso(-i, 9, 48), last_out: iso(-i, 13, 30), worked_minutes: 222,
        penalty_reason: "Worked below half-day threshold",
      });
      continue;
    }
    if (i === 23) {
      rows.push({ ...base, day_status: "absent", payable_fraction: 0, penalty_reason: "No punch recorded" });
      continue;
    }
    if (i === 9) {
      rows.push({
        ...base, day_status: "wfh", payable_fraction: 1,
        first_in: iso(-i, 9, 12), last_out: iso(-i, 18, 40), worked_minutes: 568,
      });
      continue;
    }
    if (i === 14) {
      rows.push({
        ...base, day_status: "on_duty", payable_fraction: 1,
        first_in: iso(-i, 10, 5), last_out: iso(-i, 19, 15), worked_minutes: 550,
      });
      continue;
    }

    const inMin = 25 + ((i * 7) % 25);
    const outMin = 20 + ((i * 11) % 35);
    const worked = 8 * 60 + (outMin - inMin) + 30;
    rows.push({
      ...base,
      day_status: "present",
      payable_fraction: 1,
      first_in: iso(-i, 9, inMin),
      last_out: iso(-i, 18, outMin),
      worked_minutes: worked,
      extra_minutes: worked > 540 ? worked - 540 : 0,
      is_regularized: i === 20,
      punches: [
        { id: `p-${i}-1`, punched_at: iso(-i, 9, inMin), direction: "in", source: "frs", location: "Mumbai HQ — Gate 1" },
        { id: `p-${i}-2`, punched_at: iso(-i, 13, 30), direction: "out", source: "frs", location: "Mumbai HQ — Gate 1" },
        { id: `p-${i}-3`, punched_at: iso(-i, 14, 12), direction: "in", source: "frs", location: "Mumbai HQ — Gate 1" },
        { id: `p-${i}-4`, punched_at: iso(-i, 18, outMin), direction: "out", source: "frs", location: "Mumbai HQ — Gate 1" },
      ],
    });
  }
  return rows;
}

export const DEMO_MY_ATTENDANCE: AttendanceDay[] = buildMonth();

export const DEMO_TEAM_ATTENDANCE_TODAY: AttendanceDay[] = DEMO_EMPLOYEES
  .filter((e) => e.status !== "separated")
  .map((e, i) => {
    const statuses: AttendanceDay["day_status"][] = [
      "present", "present", "present", "on_leave", "present",
      "wfh", "present", "absent", "present", "present",
      "half_day", "present", "on_duty",
    ];
    const status = statuses[i % statuses.length];
    const fraction: AttendanceDay["payable_fraction"] =
      status === "absent" ? 0 : status === "half_day" ? 0.5 : 1;
    const present = status === "present" || status === "wfh" || status === "on_duty" || status === "half_day";
    return {
      id: `att-today-${e.id}`,
      employee_id: e.id,
      employee_name: e.name,
      employee_code: e.employee_code,
      work_date: day(0),
      shift_name: e.shift_name,
      first_in: present ? iso(0, 9, 15 + ((i * 9) % 40)) : undefined,
      last_out: present && status !== "half_day" ? iso(0, 18, 10 + ((i * 13) % 45)) : undefined,
      worked_minutes: present ? (status === "half_day" ? 232 : 505 + ((i * 17) % 70)) : undefined,
      day_status: status,
      payable_fraction: fraction,
      penalty_reason: status === "absent" ? "No punch recorded" : undefined,
    };
  });

/* ── Leave ─────────────────────────────────────────────────────── */

export const DEMO_LEAVE_TYPES: LeaveType[] = [
  { id: "lt-1", name: "Earned Leave", code: "EL", annual_quota_days: 18, is_paid: true, allows_half_day: true, requires_document: false, carry_forward_cap_days: 30, is_active: true },
  { id: "lt-2", name: "Casual Leave", code: "CL", annual_quota_days: 8, is_paid: true, allows_half_day: true, requires_document: false, carry_forward_cap_days: null, is_active: true },
  { id: "lt-3", name: "Sick Leave", code: "SL", annual_quota_days: 12, is_paid: true, allows_half_day: true, requires_document: true, carry_forward_cap_days: null, is_active: true },
  { id: "lt-4", name: "Maternity Leave", code: "ML", annual_quota_days: 182, is_paid: true, allows_half_day: false, requires_document: true, carry_forward_cap_days: null, is_active: true },
  { id: "lt-5", name: "Paternity Leave", code: "PL", annual_quota_days: 5, is_paid: true, allows_half_day: false, requires_document: true, carry_forward_cap_days: null, is_active: true },
  { id: "lt-6", name: "Loss of Pay", code: "LOP", annual_quota_days: null, is_paid: false, allows_half_day: true, requires_document: false, carry_forward_cap_days: null, is_active: true },
  { id: "lt-7", name: "Compensatory Off", code: "COFF", annual_quota_days: null, is_paid: true, allows_half_day: true, requires_document: false, carry_forward_cap_days: null, is_active: true },
];

export const DEMO_MY_LEAVE_BALANCES: LeaveBalance[] = [
  { leave_type_id: "lt-1", leave_type: "Earned Leave", opening: 6, accrued: 12, used: 7, balance: 11 },
  { leave_type_id: "lt-2", leave_type: "Casual Leave", opening: 0, accrued: 8, used: 3.5, balance: 4.5 },
  { leave_type_id: "lt-3", leave_type: "Sick Leave", opening: 0, accrued: 12, used: 2, balance: 10 },
  { leave_type_id: "lt-7", leave_type: "Compensatory Off", opening: 0, accrued: 3, used: 1, balance: 2 },
];

/* ── Approval requests ─────────────────────────────────────────── */

function steps(
  first: "pending" | "approved" | "rejected",
  second?: "pending" | "approved" | "rejected" | "skipped"
): ApprovalRequest["steps"] {
  const out: ApprovalRequest["steps"] = [
    {
      sequence: 1, approver_source: "manager", approver_name: "Sameer Khan", status: first,
      acted_at: first === "pending" ? undefined : iso(-2, 11, 20),
      comment: first === "rejected" ? "Team is short-staffed that week" : undefined,
    },
  ];
  if (second) {
    out.push({
      sequence: 2, approver_source: "admin", approver_name: "Priya Nair", status: second,
      acted_at: second === "pending" || second === "skipped" ? undefined : iso(-1, 15, 5),
    });
  }
  return out;
}

export const DEMO_APPROVAL_REQUESTS: ApprovalRequest[] = [
  { id: "req-1", request_code: "LV-2451", request_type: "leave", employee_id: "e-7", employee_code: "HR-0007", employee_name: "Neha Bhatt", department: "Recruitment", subject: "Casual Leave", from_date: day(3), to_date: day(4), days: 2, reason: "Family function in Nashik", applied_at: iso(-2), status: "pending", steps: steps("pending", "pending") },
  { id: "req-2", request_code: "LV-2452", request_type: "leave", employee_id: "e-11", employee_code: "HR-0011", employee_name: "Ritu Sharma", department: "Recruitment", subject: "Sick Leave", from_date: day(-1), to_date: day(-1), days: 1, reason: "Viral fever, medical certificate attached", applied_at: iso(-1), status: "pending", steps: steps("pending") },
  { id: "req-3", request_code: "RG-0881", request_type: "regularization", employee_id: "e-6", employee_code: "HR-0006", employee_name: "Aditya Rane", department: "Technology", subject: "Missed out-punch", from_date: day(-4), to_date: day(-4), days: 1, reason: "Left for client meeting directly, forgot to punch out", applied_at: iso(-3), status: "pending", steps: steps("pending") },
  { id: "req-4", request_code: "OD-0344", request_type: "on_duty", employee_id: "e-10", employee_code: "HR-0010", employee_name: "Vikram Malhotra", department: "Client Servicing", subject: "Client visit — Infosys Bengaluru", from_date: day(-6), to_date: day(-6), days: 1, reason: "Quarterly account review at client office", applied_at: iso(-7), status: "approved", steps: steps("approved", "approved") },
  { id: "req-5", request_code: "CO-0129", request_type: "comp_off", employee_id: "e-8", employee_code: "HR-0008", employee_name: "Farhan Sheikh", department: "Operations", subject: "Comp-off for Sunday deployment", from_date: day(7), to_date: day(7), days: 1, reason: "Worked on 2 Sundays during the site handover", applied_at: iso(-4), status: "pending", steps: steps("approved", "pending") },
  { id: "req-6", request_code: "WH-0567", request_type: "wfh", employee_id: "e-13", employee_code: "HR-0013", employee_name: "Ananya Ghosh", department: "Technology", subject: "Work from home", from_date: day(1), to_date: day(2), days: 2, reason: "Society plumbing work at home", applied_at: iso(-1), status: "pending", steps: steps("pending") },
  { id: "req-7", request_code: "WO-0092", request_type: "week_off_swap", employee_id: "e-12", employee_code: "HR-0012", employee_name: "Deepak Yadav", department: "Operations", subject: "Swap Sunday off to Wednesday", from_date: day(5), to_date: day(5), days: 1, reason: "Night shift roster change at BKC site", applied_at: iso(-2), status: "pending", steps: steps("pending") },
  { id: "req-8", request_code: "EI-0231", request_type: "early_in_out", employee_id: "e-4", employee_code: "HR-0004", employee_name: "Sameer Khan", department: "Recruitment", subject: "Early out — 16:00", from_date: day(-2), to_date: day(-2), days: 1, reason: "Parent-teacher meeting", applied_at: iso(-3), status: "approved", steps: steps("approved") },
  { id: "req-9", request_code: "LV-2440", request_type: "leave", employee_id: "e-9", employee_code: "HR-0009", employee_name: "Sneha Kulkarni", department: "Finance & Accounts", subject: "Earned Leave", from_date: day(-14), to_date: day(-10), days: 5, reason: "Pre-planned vacation", applied_at: iso(-25), status: "rejected", steps: steps("rejected") },
  { id: "req-10", request_code: "LV-2438", request_type: "leave", employee_id: "e-6", employee_code: "HR-0006", employee_name: "Aditya Rane", department: "Technology", subject: "Casual Leave", from_date: day(-20), to_date: day(-20), days: 1, reason: "Personal work", applied_at: iso(-24), status: "cancelled", steps: steps("approved") },
];

/** My own requests — the Me → Leaves screen. */
export const DEMO_MY_REQUESTS: ApprovalRequest[] = [
  { id: "my-1", request_code: "LV-2455", request_type: "leave", employee_id: DEMO_ME.id, employee_code: DEMO_ME.employee_code, employee_name: DEMO_ME.name, subject: "Earned Leave", from_date: day(12), to_date: day(14), days: 3, reason: "Wedding in the family", applied_at: iso(-1), status: "pending", steps: [{ sequence: 1, approver_source: "manager", approver_name: "Anish Trivedi", status: "pending" }] },
  { id: "my-2", request_code: "LV-2401", request_type: "leave", employee_id: DEMO_ME.id, employee_code: DEMO_ME.employee_code, employee_name: DEMO_ME.name, subject: "Casual Leave", from_date: day(-6), to_date: day(-5), days: 2, reason: "Personal", applied_at: iso(-12), status: "approved", steps: [{ sequence: 1, approver_source: "manager", approver_name: "Anish Trivedi", status: "approved", acted_at: iso(-11) }] },
  { id: "my-3", request_code: "RG-0877", request_type: "regularization", employee_id: DEMO_ME.id, employee_code: DEMO_ME.employee_code, employee_name: DEMO_ME.name, subject: "Late in-punch — 09:48", from_date: day(-17), to_date: day(-17), days: 1, reason: "Local train delay on the Harbour line", applied_at: iso(-16), status: "rejected", steps: [{ sequence: 1, approver_source: "manager", approver_name: "Anish Trivedi", status: "rejected", acted_at: iso(-15), comment: "Third instance this month" }] },
  { id: "my-4", request_code: "WH-0551", request_type: "wfh", employee_id: DEMO_ME.id, employee_code: DEMO_ME.employee_code, employee_name: DEMO_ME.name, subject: "Work from home", from_date: day(-9), to_date: day(-9), days: 1, reason: "Awaiting a delivery", applied_at: iso(-10), status: "approved", steps: [{ sequence: 1, approver_source: "manager", approver_name: "Anish Trivedi", status: "approved", acted_at: iso(-10) }] },
  { id: "my-5", request_code: "CO-0121", request_type: "comp_off", employee_id: DEMO_ME.id, employee_code: DEMO_ME.employee_code, employee_name: DEMO_ME.name, subject: "Comp-off — audit weekend", from_date: day(-30), to_date: day(-30), days: 1, reason: "Statutory audit ran through Saturday", applied_at: iso(-32), status: "approved", steps: [{ sequence: 1, approver_source: "manager", approver_name: "Anish Trivedi", status: "approved", acted_at: iso(-31) }] },
];

/* ── Tickets ───────────────────────────────────────────────────── */

export const DEMO_TICKETS: Ticket[] = [
  { id: "tk-1", ticket_code: "TKT-1042", subject: "Laptop battery draining within 2 hours", category: "IT Support", priority: "high", status: "in_progress", raised_by_id: "e-13", raised_by: "Ananya Ghosh", assigned_to: "IT Helpdesk", created_at: iso(-3) },
  { id: "tk-2", ticket_code: "TKT-1041", subject: "PF number not reflecting in payslip", category: "Payroll Query", priority: "medium", status: "open", raised_by_id: "e-8", raised_by: "Farhan Sheikh", assigned_to: "Priya Nair", created_at: iso(-4) },
  { id: "tk-3", ticket_code: "TKT-1039", subject: "Attendance shows absent on 12th despite being on site", category: "Attendance Correction", priority: "high", status: "resolved", raised_by_id: "e-12", raised_by: "Deepak Yadav", assigned_to: "Priya Nair", created_at: iso(-9), resolved_at: iso(-7) },
  { id: "tk-4", ticket_code: "TKT-1038", subject: "Request for experience letter", category: "Document Request", priority: "low", status: "closed", raised_by_id: "e-9", raised_by: "Sneha Kulkarni", assigned_to: "Priya Nair", created_at: iso(-14), resolved_at: iso(-11) },
  { id: "tk-5", ticket_code: "TKT-1036", subject: "AC not working on 3rd floor", category: "Facilities", priority: "medium", status: "open", raised_by_id: "e-11", raised_by: "Ritu Sharma", created_at: iso(-1) },
  { id: "tk-6", ticket_code: "TKT-1035", subject: "Unable to access the ATS candidate module", category: "IT Support", priority: "critical", status: "resolved", raised_by_id: "e-7", raised_by: "Neha Bhatt", assigned_to: "IT Helpdesk", created_at: iso(-6), resolved_at: iso(-6) },
];

/* ── Separation ────────────────────────────────────────────────── */

export const DEMO_SEPARATIONS: Separation[] = [
  {
    id: "sep-1", employee_id: "e-9", employee_code: "HR-0009", employee_name: "Sneha Kulkarni",
    department: "Finance & Accounts", designation: "Accounts Executive", separation_type: "resignation",
    resignation_date: day(-18), notice_days: 60, last_working_date: day(42),
    reason: "Higher studies — MBA admission confirmed", status: "approved",
    clearance_pending: ["IT Assets", "Finance"], exit_interview_done: false,
  },
  {
    id: "sep-2", employee_id: "e-14", employee_code: "HR-0014", employee_name: "Manish Patel",
    department: "Finance & Accounts", designation: "Accounts Executive", separation_type: "resignation",
    resignation_date: day(-120), notice_days: 60, last_working_date: day(-60),
    reason: "Relocating to Ahmedabad", status: "approved",
    clearance_pending: [], exit_interview_done: true,
  },
  {
    id: "sep-3", employee_id: "e-11", employee_code: "HR-0011", employee_name: "Ritu Sharma",
    department: "Recruitment", designation: "Recruiter", separation_type: "resignation",
    resignation_date: day(-2), notice_days: 30, last_working_date: day(28),
    reason: "Personal reasons", status: "pending",
    clearance_pending: ["Reporting Manager", "IT Assets", "Finance", "HR"], exit_interview_done: false,
  },
];

/* ── Expense claims ────────────────────────────────────────────── */

export const DEMO_EXPENSE_CLAIMS: ExpenseClaim[] = [
  {
    id: "cl-1", claim_code: "CLM-0451", employee_id: "e-10", employee_code: "HR-0010",
    employee_name: "Vikram Malhotra", claim_date: day(-5), total_amount_paise: rupees(8450),
    status: "pending", steps: steps("approved", "pending"),
    lines: [
      { id: "cll-1", expense_type: "Travel — Outstation", expense_date: day(-8), amount_paise: rupees(6200), description: "Bengaluru → Chennai flight", has_receipt: true },
      { id: "cll-2", expense_type: "Travel — Local", expense_date: day(-8), amount_paise: rupees(1150), description: "Airport cabs", has_receipt: true },
      { id: "cll-3", expense_type: "Client Entertainment", expense_date: day(-8), amount_paise: rupees(1100), description: "Lunch with client team", has_receipt: false },
    ],
  },
  {
    id: "cl-2", claim_code: "CLM-0448", employee_id: "e-4", employee_code: "HR-0004",
    employee_name: "Sameer Khan", claim_date: day(-12), total_amount_paise: rupees(2400),
    status: "approved", steps: steps("approved", "approved"),
    lines: [
      { id: "cll-4", expense_type: "Internet & Telephone", expense_date: day(-20), amount_paise: rupees(2400), description: "Broadband — October", has_receipt: true },
    ],
  },
  {
    id: "cl-3", claim_code: "CLM-0446", employee_id: "e-13", employee_code: "HR-0013",
    employee_name: "Ananya Ghosh", claim_date: day(-16), total_amount_paise: rupees(1899),
    status: "rejected", steps: steps("rejected"),
    lines: [
      { id: "cll-5", expense_type: "Office Supplies", expense_date: day(-18), amount_paise: rupees(1899), description: "Mechanical keyboard", has_receipt: true },
    ],
  },
  {
    id: "cl-4", claim_code: "CLM-0455", employee_id: DEMO_ME.id, employee_code: DEMO_ME.employee_code,
    employee_name: DEMO_ME.name, claim_date: day(-2), total_amount_paise: rupees(3750),
    status: "pending", steps: [{ sequence: 1, approver_source: "manager", approver_name: "Anish Trivedi", status: "pending" }],
    lines: [
      { id: "cll-6", expense_type: "Travel — Local", expense_date: day(-3), amount_paise: rupees(950), description: "Cab to labour commissioner's office", has_receipt: true },
      { id: "cll-7", expense_type: "Office Supplies", expense_date: day(-4), amount_paise: rupees(2800), description: "Statutory registers and files", has_receipt: true },
    ],
  },
];

/* ── Performance ───────────────────────────────────────────────── */

export const DEMO_GOALS: Goal[] = [
  { id: "gl-1", goal_code: "GL-0231", title: "Reduce time-to-fill to under 21 days", employee_id: "e-4", employee_name: "Sameer Khan", cycle_name: "FY 2026-27 Annual", weightage: 30, target: "≤ 21 days", achieved: "24 days", progress_percent: 72, due_date: day(85), status: "in_progress" },
  { id: "gl-2", goal_code: "GL-0232", title: "Close 40 permanent placements", employee_id: "e-4", employee_name: "Sameer Khan", cycle_name: "FY 2026-27 Annual", weightage: 40, target: "40 placements", achieved: "31 placements", progress_percent: 78, due_date: day(85), status: "in_progress" },
  { id: "gl-3", goal_code: "GL-0233", title: "Roll out the HRMS to all branches", employee_id: "e-3", employee_name: "Priya Nair", cycle_name: "FY 2026-27 Annual", weightage: 35, target: "4 branches live", achieved: "2 branches live", progress_percent: 50, due_date: day(120), status: "in_progress" },
  { id: "gl-4", goal_code: "GL-0234", title: "Statutory compliance — zero notices", employee_id: "e-3", employee_name: "Priya Nair", cycle_name: "FY 2026-27 Annual", weightage: 25, target: "0 notices", achieved: "0 notices", progress_percent: 100, due_date: day(120), status: "completed" },
  { id: "gl-5", goal_code: "GL-0238", title: "Ship the candidate tagging system", employee_id: "e-13", employee_name: "Ananya Ghosh", cycle_name: "FY 2026-27 Annual", weightage: 40, target: "Released to production", progress_percent: 0, due_date: day(60), status: "pending" },
  { id: "gl-6", goal_code: "GL-0239", title: "Cut client escalations by half", employee_id: "e-10", employee_name: "Vikram Malhotra", cycle_name: "FY 2026-27 Annual", weightage: 30, target: "≤ 4 per quarter", achieved: "6 per quarter", progress_percent: 45, due_date: day(85), status: "in_progress" },
];

export const DEMO_KRAS: Kra[] = [
  { id: "kra-1", kra_code: "KRA-101", kpi_name: "Offer-to-join ratio", measurement: "Percentage", weightage: 25, score: 4, assigned_date: day(-90), designation: "Senior Recruiter" },
  { id: "kra-2", kra_code: "KRA-102", kpi_name: "Sourcing throughput", measurement: "Profiles per week", weightage: 20, score: 3, assigned_date: day(-90), designation: "Senior Recruiter" },
  { id: "kra-3", kra_code: "KRA-103", kpi_name: "Client satisfaction score", measurement: "Rating out of 5", weightage: 30, score: 5, assigned_date: day(-90), designation: "Senior Recruiter" },
  { id: "kra-4", kra_code: "KRA-104", kpi_name: "Statutory filing timeliness", measurement: "Percentage on time", weightage: 40, score: 5, assigned_date: day(-120), designation: "HR Manager" },
  { id: "kra-5", kra_code: "KRA-105", kpi_name: "Attrition control", measurement: "Annualised percentage", weightage: 30, assigned_date: day(-120), designation: "HR Manager" },
  { id: "kra-6", kra_code: "KRA-106", kpi_name: "Sprint predictability", measurement: "Percentage committed vs delivered", weightage: 35, score: 4, assigned_date: day(-60), designation: "Software Engineer" },
];

export const DEMO_CYCLES: PerformanceCycle[] = [
  { id: "cy-1", cycle_code: "CYC-2627", cycle_name: "FY 2026-27 Annual", cycle_type: "annual", period_start: "2026-04-01", period_end: "2027-03-31", self_review_start: day(60), self_review_end: day(74), manager_review_start: day(75), manager_review_end: day(89), status: "active", participants: 118 },
  { id: "cy-2", cycle_code: "CYC-H126", cycle_name: "H1 2026 Mid-Year", cycle_type: "half_yearly", period_start: "2026-04-01", period_end: "2026-09-30", self_review_start: day(-30), self_review_end: day(-16), manager_review_start: day(-15), manager_review_end: day(-1), status: "closed", participants: 112 },
  { id: "cy-3", cycle_code: "CYC-PRB1", cycle_name: "Probation Confirmation — Rolling", cycle_type: "probation", period_start: "2026-01-01", period_end: "2026-12-31", status: "active", participants: 7 },
  { id: "cy-4", cycle_code: "CYC-Q327", cycle_name: "Q3 FY 2026-27", cycle_type: "quarterly", period_start: "2026-10-01", period_end: "2026-12-31", status: "draft", participants: 0 },
];

export const DEMO_TEMPLATES: AppraisalTemplate[] = [
  { id: "tp-1", template_name: "Annual Review — Individual Contributor", template_type: "Annual", sections: 4, questions: 18, is_active: true },
  { id: "tp-2", template_name: "Annual Review — People Manager", template_type: "Annual", sections: 5, questions: 24, is_active: true },
  { id: "tp-3", template_name: "Probation Confirmation", template_type: "Probation", sections: 3, questions: 10, is_active: true },
  { id: "tp-4", template_name: "Mid-Year Check-in", template_type: "Half Yearly", sections: 3, questions: 12, is_active: true },
  { id: "tp-5", template_name: "Exit Interview", template_type: "Separation", sections: 4, questions: 15, is_active: false },
];

export const DEMO_APPRAISALS: Appraisal[] = [
  { id: "ap-1", employee_id: "e-4", employee_code: "HR-0004", employee_name: "Sameer Khan", designation: "Senior Recruiter", cycle_name: "H1 2026 Mid-Year", template_name: "Mid-Year Check-in", self_score: 4.2, manager_score: 3.9, final_rating: 4, status: "completed", submitted_at: iso(-18) },
  { id: "ap-2", employee_id: "e-3", employee_code: "HR-0003", employee_name: "Priya Nair", designation: "HR Manager", cycle_name: "H1 2026 Mid-Year", template_name: "Annual Review — People Manager", self_score: 4.5, manager_score: 4.4, final_rating: 4.5, status: "completed", submitted_at: iso(-19) },
  { id: "ap-3", employee_id: "e-13", employee_code: "HR-0013", employee_name: "Ananya Ghosh", designation: "Software Engineer", cycle_name: "FY 2026-27 Annual", template_name: "Annual Review — Individual Contributor", status: "not_started" },
  { id: "ap-4", employee_id: "e-10", employee_code: "HR-0010", employee_name: "Vikram Malhotra", designation: "Senior Recruiter", cycle_name: "H1 2026 Mid-Year", template_name: "Mid-Year Check-in", self_score: 3.6, status: "manager_review", submitted_at: iso(-20) },
  { id: "ap-5", employee_id: "e-7", employee_code: "HR-0007", employee_name: "Neha Bhatt", designation: "Recruiter", cycle_name: "Probation Confirmation — Rolling", template_name: "Probation Confirmation", status: "self_review" },
  { id: "ap-6", employee_id: "e-6", employee_code: "HR-0006", employee_name: "Aditya Rane", designation: "Software Engineer", cycle_name: "Probation Confirmation — Rolling", template_name: "Probation Confirmation", self_score: 4, manager_score: 4.1, status: "hr_review", submitted_at: iso(-8) },
];

export const DEMO_RANKING: RankingEntry[] = [
  { rank: 1, employee_id: "e-3", employee_name: "Priya Nair", employee_code: "HR-0003", department: "Human Resources", attendance_score: 98, goal_score: 92, total_score: 95, change: 2 },
  { rank: 2, employee_id: "e-13", employee_name: "Ananya Ghosh", employee_code: "HR-0013", department: "Technology", attendance_score: 96, goal_score: 90, total_score: 93, change: 0 },
  { rank: 3, employee_id: "e-4", employee_name: "Sameer Khan", employee_code: "HR-0004", department: "Recruitment", attendance_score: 91, goal_score: 88, total_score: 89.5, change: -1 },
  { rank: 4, employee_id: "e-2", employee_name: "Rohit Deshmukh", employee_code: "HR-0002", department: "Operations", attendance_score: 94, goal_score: 82, total_score: 88, change: 1 },
  { rank: 5, employee_id: "e-10", employee_name: "Vikram Malhotra", employee_code: "HR-0010", department: "Client Servicing", attendance_score: 89, goal_score: 80, total_score: 84.5, change: -2 },
  { rank: 6, employee_id: "e-8", employee_name: "Farhan Sheikh", employee_code: "HR-0008", department: "Operations", attendance_score: 92, goal_score: 74, total_score: 83, change: 3 },
  { rank: 7, employee_id: "e-6", employee_name: "Aditya Rane", employee_code: "HR-0006", department: "Technology", attendance_score: 87, goal_score: 76, total_score: 81.5, change: 0 },
  { rank: 8, employee_id: "e-12", employee_name: "Deepak Yadav", employee_code: "HR-0012", department: "Operations", attendance_score: 85, goal_score: 71, total_score: 78, change: -1 },
];

/**
 * Ranking — `04-me.md §4`.
 *
 * The reference rendered eight fixed columns. They are criteria on an appraisal
 * template, so they are data: adding a ninth must not need a migration or a
 * column. `overall_percentage` and `rank` are derived from the ratings.
 */
export const DEMO_RANKING_CRITERIA = [
  { key: "quantity", label: "Quantity of Work", weightage: 15 },
  { key: "quality", label: "Quality of Work", weightage: 20 },
  { key: "consistency", label: "Consistency", weightage: 15 },
  { key: "mentoring", label: "Mentoring Peers", weightage: 10 },
  { key: "team_player", label: "Team Player", weightage: 10 },
  { key: "proactiveness", label: "Pro-activeness", weightage: 10 },
  { key: "conduct", label: "Conduct", weightage: 10 },
  { key: "credit_score", label: "Credit Score", weightage: 10 },
];

export interface MyRankingRow {
  id: string;
  quarter: string;
  rank: number;
  cohort_size: number;
  /** Keyed by criterion, scored out of 5. */
  scores: Record<string, number>;
  overall_percentage: number;
  overall_score: number;
}

export const DEMO_MY_RANKING: MyRankingRow[] = [
  {
    id: "rk-1", quarter: "Q2 FY 2026-27", rank: 1, cohort_size: 9,
    scores: { quantity: 4.5, quality: 5, consistency: 4.5, mentoring: 4, team_player: 5, proactiveness: 4.5, conduct: 5, credit_score: 4.5 },
    overall_percentage: 92, overall_score: 4.6,
  },
  {
    id: "rk-2", quarter: "Q1 FY 2026-27", rank: 3, cohort_size: 9,
    scores: { quantity: 4, quality: 4.5, consistency: 4, mentoring: 3.5, team_player: 4.5, proactiveness: 4, conduct: 5, credit_score: 4 },
    overall_percentage: 84, overall_score: 4.2,
  },
  {
    id: "rk-3", quarter: "Q4 FY 2025-26", rank: 2, cohort_size: 8,
    scores: { quantity: 4.5, quality: 4.5, consistency: 4, mentoring: 4, team_player: 4, proactiveness: 4.5, conduct: 4.5, credit_score: 4 },
    overall_percentage: 86, overall_score: 4.3,
  },
];

/* ── Onboarding ────────────────────────────────────────────────── */

export const DEMO_ONBOARDING_CASES: OnboardingCase[] = [
  { id: "ob-1", case_code: "ONB-0212", candidate_name: "Karthik Subramanian", email: "karthik.s@gmail.com", mobile: "9884455667", designation: "Software Engineer", department: "Technology", branch: "Bengaluru — Whitefield", offered_annual_salary_paise: lacs(14), budget_annual_paise: lacs(13), proposed_doj: day(21), status: "pending_approval", documents_required: 8, documents_received: 0, source_candidate_id: "cand-10233" },
  { id: "ob-2", case_code: "ONB-0211", candidate_name: "Meenal Joshi", email: "meenal.joshi@outlook.com", mobile: "9822334455", designation: "Recruiter", department: "Recruitment", branch: "Pune — Hinjewadi", offered_annual_salary_paise: lacs(5.8), budget_annual_paise: lacs(6), proposed_doj: day(14), status: "approved", documents_required: 8, documents_received: 3, source_candidate_id: "cand-10198" },
  { id: "ob-3", case_code: "ONB-0209", candidate_name: "Abhishek Verma", email: "abhishek.v@gmail.com", mobile: "9911223344", designation: "Accounts Executive", department: "Finance & Accounts", branch: "Mumbai — Andheri East", offered_annual_salary_paise: lacs(7.2), budget_annual_paise: lacs(7.5), proposed_doj: day(7), status: "documents_submitted", documents_required: 8, documents_received: 8, source_candidate_id: "cand-10145" },
  { id: "ob-4", case_code: "ONB-0207", candidate_name: "Pooja Reddy", email: "pooja.reddy@gmail.com", mobile: "9700112233", designation: "Senior Recruiter", department: "Client Servicing", branch: "Bengaluru — Whitefield", offered_annual_salary_paise: lacs(10.5), budget_annual_paise: lacs(10), proposed_doj: day(-3), actual_doj: day(-3), status: "joined", documents_required: 8, documents_received: 8, source_candidate_id: "cand-10077" },
  { id: "ob-5", case_code: "ONB-0206", candidate_name: "Imran Qureshi", email: "imran.q@yahoo.in", mobile: "9833445566", designation: "Operations Manager", department: "Operations", branch: "Mumbai — Andheri East", offered_annual_salary_paise: lacs(16), budget_annual_paise: lacs(15), proposed_doj: day(10), status: "offer_declined", decline_reason: "Accepted a counter-offer from current employer", documents_required: 8, documents_received: 0, source_candidate_id: "cand-10051" },
  { id: "ob-6", case_code: "ONB-0213", candidate_name: "Shweta Menon", email: "shweta.menon@gmail.com", mobile: "9846677889", designation: "Software Engineer", department: "Technology", branch: "Bengaluru — Whitefield", offered_annual_salary_paise: lacs(13.5), budget_annual_paise: lacs(13), proposed_doj: day(28), status: "documents_pending", documents_required: 8, documents_received: 5, source_candidate_id: "cand-10241" },
  { id: "ob-7", case_code: "ONB-0210", candidate_name: "Rahul Bansal", email: "rahul.bansal@gmail.com", mobile: "9873322110", designation: "Recruiter", department: "Recruitment", branch: "Mumbai — Andheri East", offered_annual_salary_paise: lacs(5.2), budget_annual_paise: lacs(5.5), proposed_doj: day(18), status: "offer_sent", documents_required: 8, documents_received: 0, source_candidate_id: "cand-10180" },
];

export const DEMO_DOCUMENT_TYPES: DocumentTypeMaster[] = [
  { id: "dt-1", name: "PAN Card", category: "Identity", is_mandatory: true, requires_expiry: false, applies_to: "All employees", is_active: true },
  { id: "dt-2", name: "Aadhaar Card", category: "Identity", is_mandatory: true, requires_expiry: false, applies_to: "All employees", is_active: true },
  { id: "dt-3", name: "Passport", category: "Identity", is_mandatory: false, requires_expiry: true, applies_to: "All employees", is_active: true },
  { id: "dt-4", name: "Cancelled Cheque", category: "Banking", is_mandatory: true, requires_expiry: false, applies_to: "All employees", is_active: true },
  { id: "dt-5", name: "Degree Certificate", category: "Education", is_mandatory: true, requires_expiry: false, applies_to: "Permanent", is_active: true },
  { id: "dt-6", name: "Relieving Letter", category: "Employment", is_mandatory: true, requires_expiry: false, applies_to: "Experienced hires", is_active: true },
  { id: "dt-7", name: "Last 3 Payslips", category: "Employment", is_mandatory: true, requires_expiry: false, applies_to: "Experienced hires", is_active: true },
  { id: "dt-8", name: "Police Verification", category: "Compliance", is_mandatory: true, requires_expiry: true, applies_to: "Facility Services", is_active: true },
  { id: "dt-9", name: "Medical Fitness Certificate", category: "Compliance", is_mandatory: false, requires_expiry: true, applies_to: "Facility Services", is_active: true },
];

export const DEMO_ONBOARDING_FORMS: OnboardingFormMaster[] = [
  { id: "of-1", form_name: "Standard Onboarding — Corporate", applies_to: "Permanent · Corporate", sections: 6, documents_required: 8, is_active: true },
  { id: "of-2", form_name: "Field Staff Onboarding", applies_to: "Contract · Facility Services", sections: 4, documents_required: 6, is_active: true },
  { id: "of-3", form_name: "Intern Onboarding", applies_to: "Intern", sections: 3, documents_required: 4, is_active: true },
  { id: "of-4", form_name: "Consultant Onboarding", applies_to: "Consultant", sections: 3, documents_required: 3, is_active: false },
];

/* ── More module ───────────────────────────────────────────────── */

export const DEMO_JOB_OPENINGS: JobOpeningView[] = [
  { id: "job-1", job_title: "Senior Recruiter — IT Staffing", experience_years: "4-7", budget_annual_paise: lacs(12), openings: 3, priority: "high", status: "In Progress", created_by: "Kavya Iyer", created_at: iso(-24), in_progress_at: iso(-20) },
  { id: "job-2", job_title: "Software Engineer — Backend", experience_years: "2-5", budget_annual_paise: lacs(16), openings: 2, priority: "critical", status: "In Progress", created_by: "Anish Trivedi", created_at: iso(-31), in_progress_at: iso(-28) },
  { id: "job-3", job_title: "Housekeeping Supervisor", experience_years: "3-6", budget_annual_paise: lacs(4.5), openings: 6, priority: "medium", status: "Open", created_by: "Rohit Deshmukh", created_at: iso(-9) },
  { id: "job-4", job_title: "Accounts Executive", experience_years: "1-3", budget_annual_paise: lacs(7), openings: 1, priority: "medium", status: "Closed", created_by: "Priya Nair", created_at: iso(-72), in_progress_at: iso(-66), closed_at: iso(-14) },
  { id: "job-5", job_title: "Client Servicing Manager", experience_years: "6-10", budget_annual_paise: lacs(18), openings: 1, priority: "high", status: "On Hold", created_by: "Kavya Iyer", created_at: iso(-40), in_progress_at: iso(-35) },
  { id: "job-6", job_title: "Security Guard — BKC Site", experience_years: "0-2", budget_annual_paise: lacs(3.2), openings: 12, priority: "low", status: "Open", created_by: "Rohit Deshmukh", created_at: iso(-4) },
];

export const DEMO_ASSETS: Asset[] = [
  { id: "as-1", asset_code: "AST-0101", category: "Laptop", make: "Dell", model: "Latitude 5440", serial_number: "DL5440X8821", purchase_date: "2024-06-11", status: "allocated", allocated_to: "Ananya Ghosh", allocated_on: day(-410) },
  { id: "as-2", asset_code: "AST-0102", category: "Laptop", make: "Apple", model: "MacBook Air M3", serial_number: "MBAM3K7712", purchase_date: "2025-02-20", status: "allocated", allocated_to: "Anish Trivedi", allocated_on: day(-300) },
  { id: "as-3", asset_code: "AST-0103", category: "Mobile", make: "Samsung", model: "Galaxy M14", serial_number: "SMM14G4432", purchase_date: "2024-11-05", status: "allocated", allocated_to: "Farhan Sheikh", allocated_on: day(-180) },
  { id: "as-4", asset_code: "AST-0104", category: "Laptop", make: "Lenovo", model: "ThinkPad E14", serial_number: "LTE14P9901", purchase_date: "2023-08-14", status: "in_repair" },
  { id: "as-5", asset_code: "AST-0105", category: "Monitor", make: "LG", model: "24MK600M", serial_number: "LG24M5567", purchase_date: "2024-01-30", status: "in_stock" },
  { id: "as-6", asset_code: "AST-0106", category: "Access Card", make: "HID", model: "ProxCard II", serial_number: "HIDPC33210", purchase_date: "2025-05-02", status: "allocated", allocated_to: "Deepak Yadav", allocated_on: day(-90) },
  { id: "as-7", asset_code: "AST-0107", category: "Laptop", make: "Dell", model: "Inspiron 3520", serial_number: "DI3520B1140", purchase_date: "2022-03-18", status: "retired" },
];

/** Assets held by the employee whose record is open. */
export const DEMO_MY_ASSETS: Asset[] = [
  { id: "as-8", asset_code: "AST-0121", category: "Laptop", make: "HP", model: "EliteBook 840", serial_number: "HP840G9-4471", purchase_date: "2024-09-09", status: "allocated", allocated_to: DEMO_ME.name, allocated_on: day(-340) },
  { id: "as-9", asset_code: "AST-0122", category: "Access Card", make: "HID", model: "ProxCard II", serial_number: "HIDPC33455", purchase_date: "2024-09-09", status: "allocated", allocated_to: DEMO_ME.name, allocated_on: day(-340) },
];

export const DEMO_ANNOUNCEMENTS: Announcement[] = [
  { id: "an-1", title: "Diwali holiday schedule announced", body: "The office will remain closed from 20 to 22 October. Client-site teams follow the roster shared by their supervisors.", category: "Policy", published_at: iso(-2), expires_at: iso(30), audience_scope: "organization", is_pinned: true },
  { id: "an-2", title: "New attendance policy effective next month", body: "Grace period reduces from 15 minutes to 10 minutes. Three late marks in a month will count as one half-day.", category: "Policy", published_at: iso(-5), expires_at: iso(25), audience_scope: "organization", is_pinned: true },
  { id: "an-3", title: "Fire drill — Andheri office, Thursday 11:00", body: "Assemble at the rear parking lot. Attendance will be taken by floor wardens.", category: "IT & Facilities", published_at: iso(-1), expires_at: iso(3), audience_scope: "branch", audience_scope_name: "Mumbai — Andheri East", is_pinned: false },
  { id: "an-4", title: "Congratulations to our Q2 top performers", body: "Priya Nair, Ananya Ghosh and Sameer Khan led the ranking this quarter.", category: "Celebration", published_at: iso(-8), expires_at: null, audience_scope: "organization", is_pinned: false },
  { id: "an-5", title: "POSH refresher training — mandatory", body: "All employees must complete the refresher module before the end of the month.", category: "Compliance", published_at: iso(-12), expires_at: iso(18), audience_scope: "organization", is_pinned: false },
];

/* ── Settings ──────────────────────────────────────────────────── */

export const DEMO_SHIFTS: Shift[] = [
  { id: "sh-1", name: "General Shift", code: "GEN", start_time: "09:30", end_time: "18:30", break_minutes: 60, working_hours: 8, grace_in_minutes: 15, grace_out_minutes: 15, half_day_after_minutes: 240, attendance_mode: "working_hours_only", week_off_days: ["Saturday", "Sunday"], is_active: true },
  { id: "sh-2", name: "Morning Shift", code: "MOR", start_time: "06:00", end_time: "14:00", break_minutes: 30, working_hours: 7.5, grace_in_minutes: 10, grace_out_minutes: 10, half_day_after_minutes: 225, attendance_mode: "strict_shift_timing", week_off_days: ["Sunday"], is_active: true },
  { id: "sh-3", name: "Evening Shift", code: "EVE", start_time: "14:00", end_time: "22:00", break_minutes: 30, working_hours: 7.5, grace_in_minutes: 10, grace_out_minutes: 10, half_day_after_minutes: 225, attendance_mode: "strict_shift_timing", week_off_days: ["Sunday"], is_active: true },
  { id: "sh-4", name: "Night Shift", code: "NGT", start_time: "22:00", end_time: "06:00", break_minutes: 45, working_hours: 7.25, grace_in_minutes: 10, grace_out_minutes: 10, half_day_after_minutes: 220, attendance_mode: "strict_shift_timing", week_off_days: ["Sunday"], is_active: true },
  { id: "sh-5", name: "Flexi Shift", code: "FLX", start_time: "00:00", end_time: "23:59", break_minutes: 60, working_hours: 8, grace_in_minutes: 0, grace_out_minutes: 0, half_day_after_minutes: null, attendance_mode: "working_hours_only", week_off_days: ["Saturday", "Sunday"], is_active: false },
];

export const DEMO_HOLIDAYS: Holiday[] = [
  { id: "hd-1", name: "Republic Day", holiday_date: "2026-01-26", holiday_type: "public", applies_to: "All branches", is_active: true },
  { id: "hd-2", name: "Holi", holiday_date: "2026-03-04", holiday_type: "public", applies_to: "All branches", is_active: true },
  { id: "hd-3", name: "Gudi Padwa", holiday_date: "2026-03-19", holiday_type: "regional", applies_to: "Mumbai · Pune", is_active: true },
  { id: "hd-4", name: "Independence Day", holiday_date: "2026-08-15", holiday_type: "public", applies_to: "All branches", is_active: true },
  { id: "hd-5", name: "Ganesh Chaturthi", holiday_date: "2026-09-14", holiday_type: "regional", applies_to: "Mumbai · Pune", is_active: true },
  { id: "hd-6", name: "Gandhi Jayanti", holiday_date: "2026-10-02", holiday_type: "public", applies_to: "All branches", is_active: true },
  { id: "hd-7", name: "Diwali — Laxmi Pujan", holiday_date: "2026-11-08", holiday_type: "public", applies_to: "All branches", is_active: true },
  { id: "hd-8", name: "Christmas", holiday_date: "2026-12-25", holiday_type: "public", applies_to: "All branches", is_active: true },
  { id: "hd-9", name: "Karva Chauth", holiday_date: "2026-10-29", holiday_type: "restricted", applies_to: "All branches", is_active: true },
];

export const DEMO_CRON_JOBS: CronJob[] = [
  { id: "cr-1", name: "Materialise attendance day register", description: "Builds one row per employee per date from the punch table", schedule: "Every day at 01:00", last_run_at: iso(0, 1), next_run_at: iso(1, 1), last_status: "success", is_enabled: true },
  { id: "cr-2", name: "Accrue monthly leave", description: "Posts the monthly accrual entry to the leave ledger", schedule: "1st of every month at 02:00", last_run_at: iso(-11, 2), next_run_at: iso(19, 2), last_status: "success", is_enabled: true },
  { id: "cr-3", name: "Probation confirmation reminder", description: "Notifies managers 15 days before probation ends", schedule: "Every day at 08:00", last_run_at: iso(0, 8), next_run_at: iso(1, 8), last_status: "success", is_enabled: true },
  { id: "cr-4", name: "Birthday & anniversary digest", description: "Posts to the dashboard widget and emails the org", schedule: "Every day at 07:30", last_run_at: iso(0, 7, 30), next_run_at: iso(1, 7, 30), last_status: "success", is_enabled: true },
  { id: "cr-5", name: "De-allocate device on last working day", description: "Flags assets held by employees whose LWD has passed", schedule: "Every day at 22:00", last_run_at: iso(-1, 22), next_run_at: iso(0, 22), last_status: "failed", is_enabled: true },
  { id: "cr-6", name: "Document expiry alert", description: "Warns 30 days before a document expires", schedule: "Every Monday at 09:00", last_run_at: iso(-3, 9), next_run_at: iso(4, 9), last_status: "success", is_enabled: true },
  { id: "cr-7", name: "Escalate stale approvals", description: "Escalates requests pending beyond the SLA", schedule: "Every 6 hours", last_run_at: iso(0, 6), next_run_at: iso(0, 12), last_status: "success", is_enabled: false },
];

export const DEMO_EMAIL_TEMPLATES: EmailTemplateMaster[] = [
  { id: "em-1", name: "Offer letter", event_key: "onboarding.offer_sent", subject: "Your offer from HireRabbits", is_active: true },
  { id: "em-2", name: "Welcome — first day", event_key: "employee.joined", subject: "Welcome aboard, {{employee_name}}", is_active: true },
  { id: "em-3", name: "Leave approved", event_key: "leave.approved", subject: "Your leave request {{request_code}} was approved", is_active: true },
  { id: "em-4", name: "Leave rejected", event_key: "leave.rejected", subject: "Your leave request {{request_code}} was rejected", is_active: true },
  { id: "em-5", name: "Document pending reminder", event_key: "onboarding.documents_pending", subject: "Documents pending for your onboarding", is_active: true },
  { id: "em-6", name: "Appraisal window open", event_key: "performance.self_review_open", subject: "Your self-review is open until {{self_review_end}}", is_active: false },
  { id: "em-7", name: "Exit clearance", event_key: "separation.clearance_pending", subject: "Clearance pending before your last working day", is_active: true },
];

export const DEMO_ROLES: RoleDefinition[] = [
  { id: "rl-1", name: "Administrator", description: "Full access to every module and setting", is_system: true, member_count: 2, permissions: ["*"] },
  { id: "rl-2", name: "HR Manager", description: "People data, approvals, onboarding and settings", is_system: true, member_count: 3, permissions: ["employee.read", "employee.write", "approval.act", "onboarding.manage", "settings.manage"] },
  { id: "rl-3", name: "Reporting Manager", description: "Approves for direct reports only", is_system: true, member_count: 22, permissions: ["employee.read.team", "approval.act.team", "goal.manage.team"] },
  { id: "rl-4", name: "Employee", description: "Self-service only", is_system: true, member_count: 131, permissions: ["self.read", "self.request"] },
  { id: "rl-5", name: "Finance", description: "Reimbursements and payroll-facing reports", is_system: false, member_count: 4, permissions: ["expense.act", "report.payroll"] },
];

export const DEMO_ACTIVITY_LOG: ActivityLogEntry[] = [
  { id: "al-1", occurred_at: iso(0, 10, 42), actor_name: "Priya Nair", action: "Approved leave request", entity_type: "approval_request", entity_label: "LV-2401", ip_address: "103.21.44.12" },
  { id: "al-2", occurred_at: iso(0, 9, 58), actor_name: "Anish Trivedi", action: "Updated attendance policy", entity_type: "organization_settings", entity_label: "Grace period 15m → 10m", ip_address: "103.21.44.9" },
  { id: "al-3", occurred_at: iso(-1, 17, 12), actor_name: "Priya Nair", action: "Created employee", entity_type: "employee", entity_label: "HR-0011 Ritu Sharma", ip_address: "103.21.44.12" },
  { id: "al-4", occurred_at: iso(-1, 15, 30), actor_name: "Kavya Iyer", action: "Rejected candidate offer", entity_type: "onboarding_case", entity_label: "ONB-0206", ip_address: "49.36.220.75" },
  { id: "al-5", occurred_at: iso(-2, 11, 4), actor_name: "System", action: "Cron failed", entity_type: "cron_job", entity_label: "De-allocate device on last working day" },
  { id: "al-6", occurred_at: iso(-2, 9, 20), actor_name: "Rohit Deshmukh", action: "Viewed banking details", entity_type: "employee", entity_label: "HR-0008 Farhan Sheikh", ip_address: "103.21.44.31" },
];

/* ── Dashboard aggregates ──────────────────────────────────────── */

export const DEMO_DASHBOARD = {
  headcount: 138,
  headcount_change: 6,
  present_today: 121,
  on_leave_today: 9,
  absent_today: 8,
  pending_approvals: 6,
  open_positions: 25,
  new_this_week: 2,
  on_hold: 1,
  attrition_percent: 11.4,
  average_tenure_months: 27,
  probation_ending: 3,
  documents_pending: 4,
  birthdays: [
    { id: "e-13", name: "Ananya Ghosh", date: day(1), department: "Technology" },
    { id: "e-8", name: "Farhan Sheikh", date: day(4), department: "Operations" },
  ],
  anniversaries: [
    { id: "e-2", name: "Rohit Deshmukh", date: day(2), years: 6 },
    { id: "e-10", name: "Vikram Malhotra", date: day(6), years: 5 },
  ],
  headcount_by_department: [
    { name: "Operations", value: 44 },
    { name: "Recruitment", value: 22 },
    { name: "Client Servicing", value: 15 },
    { name: "Technology", value: 12 },
    { name: "Human Resources", value: 9 },
    { name: "Finance & Accounts", value: 6 },
  ],
  attendance_trend: Array.from({ length: 14 }, (_, i) => ({
    date: day(-13 + i),
    present: 108 + ((i * 5) % 14),
    absent: 4 + ((i * 3) % 7),
    on_leave: 6 + ((i * 2) % 5),
  })),
};
