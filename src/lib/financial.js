export const isActiveFinancialRecord = (row) => row?.status !== 'voided';

export const activeRows = (rows = []) => rows.filter(isActiveFinancialRecord);

export const sumAmounts = (rows = []) => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

export const sumActiveAmounts = (rows = []) => sumAmounts(activeRows(rows));