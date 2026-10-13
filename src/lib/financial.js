export const isActiveFinancialRecord = (row) => row?.status !== 'voided';

export const activeRows = (rows = []) => rows.filter(isActiveFinancialRecord);

const amountInCents = (amount) => {
	const value = Number(amount || 0);
	return Number.isFinite(value) ? Math.round(value * 100) : 0;
};

export const sumAmounts = (rows = []) => (
	rows.reduce((cents, row) => cents + amountInCents(row.amount), 0) / 100
);

export const sumActiveAmounts = (rows = []) => sumAmounts(activeRows(rows));

export const forecastAnnualSpend = (spent, elapsedMonths) => {
	const months = Math.min(12, Math.max(1, Math.trunc(Number(elapsedMonths) || 1)));
	return Math.round((amountInCents(spent) * 12) / months) / 100;
};