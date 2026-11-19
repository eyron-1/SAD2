import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function FormField({
  label,
  error,
  as = 'input',
  children,
  className = '',
  showPasswordToggle = false,
  ...inputProps
}) {
  const fieldId = useId();
  const id = inputProps.id || fieldId;
  const errorId = `${id}-error`;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const fieldClass = `input-field ${error ? 'input-error' : ''} ${className}`;
  const accessibilityProps = {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  };
  return (
    <div>
      {label && <label htmlFor={id} className="label">{label}</label>}
      {as === 'textarea' ? (
        <textarea id={id} className={fieldClass} {...accessibilityProps} {...inputProps} />
      ) : as === 'select' ? (
        <select id={id} className={fieldClass} {...accessibilityProps} {...inputProps}>
          {children}
        </select>
      ) : (
        <div className={showPasswordToggle ? 'relative' : ''}>
          <input
            id={id}
            className={`${fieldClass} ${showPasswordToggle ? 'pr-11' : ''}`}
            {...accessibilityProps}
            {...inputProps}
            type={showPasswordToggle && passwordVisible ? 'text' : inputProps.type}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              title={passwordVisible ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg p-1.5 text-slate-400 hover:text-slate-700"
            >
              {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}
      {error && <p id={errorId} className="error-text">{error}</p>}
    </div>
  );
}
