export default function ReportPrintTable({ title, columns, rows, emptyMessage }) {
  return (
    <section className="hidden print-report-section" data-print="show">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={row.id || `${title}-${index}`}>
              {columns.map((column) => (
                <td key={column.label}>{column.render ? column.render(row[column.key], row) : row[column.key] ?? '—'}</td>
              ))}
            </tr>
          )) : (
            <tr><td colSpan={columns.length}>{emptyMessage || 'No records for this period.'}</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
