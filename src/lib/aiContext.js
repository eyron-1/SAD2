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

const publicText = (value, maxLength = MAX_DESCRIPTION_LENGTH) =>
  limitText(value, maxLength);

const publicRows = (rows, fields) =>
  rows.slice(0, MAX_CONTEXT_ROWS).map((row) =>
    Object.fromEntries(
      fields
        .filter((field) => row[field] !== undefined && row[field] !== null)
        .map((field) => [
          field,
          typeof row[field] === "string"
            ? publicText(row[field], field === "description" ? 180 : MAX_LABEL_LENGTH)
            : row[field],
        ]),
    ),
  );

export function createPublicAIContext({
  barangay,
  officials,
  allocations,
  expenses,
  programs,
  skFunds,
  skAllocations,
  skExpenses,
  skPrograms,
}) {
  return {
    barangay: {
      name: publicText(barangay.name, MAX_LABEL_LENGTH),
      municipality: publicText(barangay.municipality, MAX_LABEL_LENGTH),
      province: publicText(barangay.province, MAX_LABEL_LENGTH),
    },
    barangay_officials: publicRows(officials, [
      "full_name",
      "role",
      "term_start",
      "term_end",
    ]),
    barangay_budget_allocations: publicRows(allocations, [
      "fiscal_year",
      "category",
      "amount",
      "description",
    ]),
    barangay_expenses: publicRows(expenses, [
      "category",
      "amount",
      "description",
      "date_incurred",
      "status",
    ]),
    barangay_programs: publicRows(programs, [
      "title",
      "description",
      "category",
      "budget_amount",
      "start_date",
      "end_date",
      "status",
      "beneficiaries_count",
      "beneficiary_category",
    ]),
    sk_fund_sources: publicRows(skFunds, [
      "name",
      "fiscal_year",
      "amount",
      "description",
    ]),
    sk_budget_allocations: publicRows(skAllocations, [
      "fiscal_year",
      "category",
      "amount",
      "description",
    ]),
    sk_expenses: publicRows(skExpenses, [
      "category",
      "amount",
      "description",
      "date_incurred",
      "status",
    ]),
    sk_programs: publicRows(skPrograms, [
      "title",
      "description",
      "category",
      "budget_amount",
      "start_date",
      "end_date",
      "status",
    ]),
  };
}
