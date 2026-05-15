import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildExpenseAttachmentPath,
  normalizeAdvancePayload,
  normalizeExpenseClaimPayload,
  normalizeExpenseLineItems,
  normalizeTravelRequestPayload,
  normalizeVehicleLogPayload,
  normalizeVehicleServicePayload,
  stripExpenseReadOnlyFields,
  sumExpenseLineItems,
  validateTravelDateRange,
} from "@/lib/hrms/expenses";

describe("expense helper utilities", () => {
  it("normalizes expense claims, defaults status, and strips read-only fields", () => {
    const payload = normalizeExpenseClaimPayload({
      id: "claim-1",
      created_by: "profile-1",
      employee_id: "employee-1",
      purpose: "  Site   visit  ",
      claim_date: "2026-05-12",
      status: "Submitted",
      total_amount: "9999",
      notes: "  client lunch  ",
    });

    assert.deepEqual(payload, {
      employee_id: "employee-1",
      purpose: "Site visit",
      claim_date: "2026-05-12",
      status: "submitted",
      notes: "client lunch",
    });
  });

  it("normalizes line items and sums positive amounts", () => {
    const items = normalizeExpenseLineItems([
      { expense_type_key: "meals", description: " Lunch ", amount: "100.50", spent_on: "2026-05-12", id: "readonly" },
      { expense_type_key: "taxi", amount: 200, spent_on: "2026-05-13" },
    ]);

    assert.deepEqual(items, [
      { expense_type_key: "meals", description: "Lunch", amount: 100.5, spent_on: "2026-05-12" },
      { expense_type_key: "taxi", amount: 200, spent_on: "2026-05-13" },
    ]);
    assert.equal(sumExpenseLineItems(items), 300.5);
  });

  it("strips read-only fields without mutating the source object", () => {
    const input = { id: "x", employee_id: "employee-1", approved_at: "2026-05-12" };
    const output = stripExpenseReadOnlyFields(input);

    assert.deepEqual(output, { employee_id: "employee-1" });
    assert.equal(input.id, "x");
  });

  it("builds sanitized private attachment paths", () => {
    assert.equal(
      buildExpenseAttachmentPath("employee 1", "claim/2", "../Receipt Final!!.PDF"),
      "employee-1/claim-2/receipt-final.pdf",
    );
  });

  it("normalizes advances and blocks caller-controlled settlement state", () => {
    const payload = normalizeAdvancePayload({
      employee_id: "employee-1",
      requested_amount: "2500.75",
      purpose: "  Travel advance ",
      status: "APPROVED",
      settled_amount: 2500,
      settled_at: "2026-05-12",
    });

    assert.deepEqual(payload, {
      employee_id: "employee-1",
      requested_amount: 2500.75,
      purpose: "Travel advance",
      status: "approved",
    });
  });

  it("validates travel dates and normalizes itinerary rows", () => {
    assert.deepEqual(validateTravelDateRange("2026-05-15", "2026-05-14"), {
      valid: false,
      reason: "Travel end date cannot be before start date.",
    });

    const payload = normalizeTravelRequestPayload({
      employee_id: "employee-1",
      destination: "  Mumbai  ",
      start_date: "2026-05-14",
      end_date: "2026-05-15",
      itinerary: [
        { travel_date: "2026-05-14", from_location: " Pune ", to_location: " Mumbai ", mode: "Train", estimated_amount: "650" },
      ],
    });

    assert.deepEqual(payload.itinerary, [
      { travel_date: "2026-05-14", from_location: "Pune", to_location: "Mumbai", mode: "Train", estimated_amount: 650 },
    ]);
  });

  it("normalizes vehicle log and service payloads", () => {
    assert.deepEqual(normalizeVehicleLogPayload({
      employee_id: "employee-1",
      travel_date: "2026-05-12",
      vehicle_number: " mh 12 ab 1234 ",
      distance_km: "45.5",
      amount: "455",
      status: "submitted",
    }), {
      employee_id: "employee-1",
      travel_date: "2026-05-12",
      vehicle_number: "mh 12 ab 1234",
      distance_km: 45.5,
      amount: 455,
      status: "submitted",
    });

    assert.deepEqual(normalizeVehicleServicePayload({
      employee_id: "employee-1",
      service_date: "2026-05-12",
      vehicle_number: "MH12AB1234",
      vendor_name: " Garage ",
      amount: "1200",
    }), {
      employee_id: "employee-1",
      service_date: "2026-05-12",
      vehicle_number: "MH12AB1234",
      vendor_name: "Garage",
      amount: 1200,
      status: "draft",
    });
  });
});
