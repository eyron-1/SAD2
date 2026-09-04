export default function FormField({
  label,
  error,
  as = 'input',
  children,
  className = '',
  ...inputProps
}) {
  const fieldClass = `input-field ${error ? 'input-error' : ''} ${className}`;
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {as === 'textarea' ? (
        <textarea className={fieldClass} {...inputProps} />
      ) : as === 'select' ? (
        <select className={fieldClass} {...inputProps}>
          {children}
        </select>
      ) : (
        <input className={fieldClass} {...inputProps} />
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
