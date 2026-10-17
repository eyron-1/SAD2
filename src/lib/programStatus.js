export function getDateBasedProgramStatus(row, today) {
  if (row.status === 'cancelled' || row.status === 'completed') {
    return row.status;
  }

  if (row.end_date && row.end_date <= today) {
    return 'completed';
  }

  if (row.status === 'planned' && row.start_date && row.start_date <= today) {
    return 'ongoing';
  }

  return row.status;
}

export function getPhilippineDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
