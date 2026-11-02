const MAX_CONTEXT_ROWS = 12;
const MAX_DESCRIPTION_LENGTH = 120;
const MAX_LABEL_LENGTH = 80;

const limitText = (value, maxLength) =>
  typeof value === "string" ? value.slice(0, maxLength) : value;

export function createAIContext({ allocations, expenses, programs }) {
  return {
    budget_allocations: allocations.slice(0, MAX_CONTEXT_ROWS).map((row) => ({
      fiscal_year: row.fiscal_year,
      category: limitText(row.category, MAX_LABEL_LENGTH),
      amount: row.amount,
      description: limitText(row.description, MAX_DESCRIPTION_LENGTH),
    })),
    expenses: expenses.slice(0, MAX_CONTEXT_ROWS).map((row) => ({
      category: limitText(row.category, MAX_LABEL_LENGTH),
      amount: row.amount,
      description: limitText(row.description, MAX_DESCRIPTION_LENGTH),
      date_incurred: row.date_incurred,
      status: row.status,
    })),
    programs: programs.slice(0, MAX_CONTEXT_ROWS).map((row) => ({
      title: limitText(row.title, MAX_LABEL_LENGTH),
      description: limitText(row.description, MAX_DESCRIPTION_LENGTH),
      category: limitText(row.category, MAX_LABEL_LENGTH),
      budget_amount: row.budget_amount,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      beneficiaries_count: row.beneficiaries_count,
      beneficiary_category: limitText(
        row.beneficiary_category,
        MAX_LABEL_LENGTH,
      ),
    })),
  };
}
