const amountInCents = (amount) => {
  const value = Number(amount || 0);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
};

export function getRemainingAllocationBudget({
  allocationAmount,
  programs,
  allocationId,
  allocationIdField,
  editingId = null,
}) {
  const committedAmountInCents = programs.reduce((total, program) => {
    if (program.id === editingId || program[allocationIdField] !== allocationId) {
      return total;
    }
    return total + amountInCents(program.budget_amount);
  }, 0);

  return Math.max(0, amountInCents(allocationAmount) - committedAmountInCents) / 100;
}

export function validateProgramAllocationBudget(budgetAmount, remainingAmount) {
  if (amountInCents(budgetAmount) <= amountInCents(remainingAmount)) return "";

  return `Budget exceeds the remaining allocation of ₱${remainingAmount.toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  )}.`;
}
