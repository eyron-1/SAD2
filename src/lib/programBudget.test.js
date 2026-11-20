import test from "node:test";
import assert from "node:assert/strict";
import {
  getRemainingAllocationBudget,
  validateProgramAllocationBudget,
} from "./programBudget.js";

test("remaining allocation subtracts all linked project budgets", () => {
  const remaining = getRemainingAllocationBudget({
    allocationAmount: 10000,
    allocationId: "allocation-1",
    allocationIdField: "budget_allocation_id",
    programs: [
      { id: "program-1", budget_allocation_id: "allocation-1", budget_amount: 2500 },
      { id: "program-2", budget_allocation_id: "allocation-1", budget_amount: 3000 },
      { id: "program-3", budget_allocation_id: "allocation-2", budget_amount: 1000 },
    ],
  });

  assert.equal(remaining, 4500);
});

test("remaining allocation excludes the project being edited", () => {
  const remaining = getRemainingAllocationBudget({
    allocationAmount: 10000,
    allocationId: "allocation-1",
    allocationIdField: "sk_budget_id",
    editingId: "program-1",
    programs: [
      { id: "program-1", sk_budget_id: "allocation-1", budget_amount: 4000 },
      { id: "program-2", sk_budget_id: "allocation-1", budget_amount: 3000 },
    ],
  });

  assert.equal(remaining, 7000);
});

test("remaining allocation arithmetic stays exact to the cent", () => {
  const remaining = getRemainingAllocationBudget({
    allocationAmount: 0.3,
    allocationId: "allocation-1",
    allocationIdField: "budget_allocation_id",
    programs: [
      { id: "program-1", budget_allocation_id: "allocation-1", budget_amount: 0.1 },
    ],
  });

  assert.equal(remaining, 0.2);
  assert.equal(validateProgramAllocationBudget(0.2, remaining), "");
});

test("allocation budget validation allows the remaining amount but rejects overspending", () => {
  assert.equal(validateProgramAllocationBudget(4500, 4500), "");
  assert.equal(
    validateProgramAllocationBudget(4500.01, 4500),
    "Budget exceeds the remaining allocation of ₱4,500.00.",
  );
});
