export default function ReportPrintTable({
  title,
  columns,
  rows = [],
  emptyMessage = 'No records for this period.',
  showTotal = true,
}) {
  const phpFmt = (v) => {
    const num = Number(v);
    if (!Number.isFinite(num)) return '—';
    return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const numFmt = (v) => {
    const num = Number(v);
    if (!Number.isFinite(num)) return '—';
    return num.toLocaleString('en-PH');
  };

  // Calculate totals
  const totals = {};
  let hasTotals = false;
  columns.forEach((col) => {
    if (col.format === 'currency' || col.format === 'number') {
      const sum = rows.reduce((acc, row) => {
        const val = Number(row[col.key]);
        return acc + (Number.isFinite(val) ? val : 0);
      }, 0);
      totals[col.key] = sum;
      hasTotals = true;
    }
  });

  return (
    <section className="hidden print-report-section" data-print="show">
      <div className="print-section-header">
        <h2 className="print-section-title">{title}</h2>
        <span className="print-section-count">
          {rows.length} {rows.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th className="print-th-num">#</th>
            {columns.map((column) => {
              const align = column.align || (column.format === 'currency' || column.format === 'number' ? 'right' : 'left');
              return (
                <th key={column.label} style={{ textAlign: align }}>
                  {column.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={row.id || `${title}-${index}`} className={index % 2 === 1 ? 'print-row-alt' : ''}>
                <td className="print-td-num">{index + 1}</td>
                {columns.map((column) => {
                  const align = column.align || (column.format === 'currency' || column.format === 'number' ? 'right' : 'left');
                  const rawValue = row[column.key];
                  let display = rawValue;

                  if (column.render) {
                    display = column.render(rawValue, row);
                  } else if (column.format === 'currency') {
                    display = rawValue != null && rawValue !== '' ? phpFmt(rawValue) : '—';
                  } else if (column.format === 'number') {
                    display = rawValue != null && rawValue !== '' ? numFmt(rawValue) : '—';
                  } else {
                    display = rawValue ?? '—';
                  }

                  return (
                    <td key={column.label} style={{ textAlign: align }}>
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + 1} className="print-td-empty">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>

        {showTotal && hasTotals && rows.length > 0 && (
          <tfoot>
            <tr className="print-total-row">
              <td colSpan={2} className="print-total-label">
                TOTAL
              </td>
              {columns.slice(1).map((column) => {
                const align = column.align || (column.format === 'currency' || column.format === 'number' ? 'right' : 'left');
                let cellTotal = '—';
                if (column.format === 'currency') {
                  cellTotal = phpFmt(totals[column.key]);
                } else if (column.format === 'number') {
                  cellTotal = numFmt(totals[column.key]);
                }
                return (
                  <td key={column.label} style={{ textAlign: align }} className="print-total-val">
                    {cellTotal}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </section>
  );
}
