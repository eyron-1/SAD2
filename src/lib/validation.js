// ============================================================
// Central validation patterns for the whole system.
// Import PATTERNS directly for one-off checks, or use the
// validate*() helpers which return a human-readable error
// string (or '' when the value is valid) — this keeps every
// form's error-handling shape identical.
// ============================================================

export const PATTERNS = {
  // 09XXXXXXXXX or +639XXXXXXXXX — Philippine mobile numbers
  phMobile: /^(?:\+63|0)9\d{9}$/,
  // standard email
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // currency: optional leading peso sign, digits, optional 2-decimal
  currency: /^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/,
  // fiscal year like 2026 or 2026-2027
  fiscalYear: /^\d{4}(-\d{4})?$/,
  // strong-ish password: min 8 chars, 1 upper, 1 lower, 1 number
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  // plain names — letters, spaces, hyphens, apostrophes, periods
  personName: /^[A-Za-zÀ-ÿ.'\-\s]{2,80}$/,
  // slug for barangay landing page URLs
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};

export function validateRequired(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return `${label} is required.`;
  }
  return '';
}

export function validateMobile(value, { required = true } = {}) {
  if (!value) return required ? 'Mobile number is required.' : '';
  if (!PATTERNS.phMobile.test(value.trim())) {
    return 'Enter a valid PH mobile number, e.g. 09171234567.';
  }
  return '';
}

export function validateEmail(value, { required = true } = {}) {
  if (!value) return required ? 'Email is required.' : '';
  if (!PATTERNS.email.test(value.trim())) return 'Enter a valid email address.';
  return '';
}

export function validateCurrency(value, label = 'Amount') {
  if (value === '' || value === null || value === undefined) return `${label} is required.`;
  const clean = String(value).replace(/,/g, '');
  if (!PATTERNS.currency.test(String(value)) || isNaN(Number(clean))) {
    return `${label} must be a valid amount, e.g. 15000 or 15,000.50.`;
  }
  if (Number(clean) < 0) return `${label} cannot be negative.`;
  return '';
}

export function validateFiscalYear(value) {
  if (!value) return 'Fiscal year is required.';
  if (!PATTERNS.fiscalYear.test(value.trim())) {
    return 'Fiscal year must look like 2026 or 2026-2027.';
  }
  return '';
}

export function validatePassword(value) {
  if (!value) return 'Password is required.';
  if (!PATTERNS.password.test(value)) {
    return 'Password needs 8+ characters, including upper, lower, and a number.';
  }
  return '';
}

export function validateName(value, label = 'Name') {
  if (!value) return `${label} is required.`;
  if (!PATTERNS.personName.test(value.trim())) {
    return `${label} looks invalid — letters, spaces, hyphens only.`;
  }
  return '';
}

export function validateDateRange(start, end) {
  if (start && end && new Date(end) < new Date(start)) {
    return 'End date cannot be earlier than the start date.';
  }
  return '';
}

// Runs a map of { field: validatorFn } against a form's values object.
// Returns { errors, isValid } so components stay declarative.
export function runValidators(values, validatorMap) {
  const errors = {};
  Object.entries(validatorMap).forEach(([field, fn]) => {
    const msg = fn(values[field]);
    if (msg) errors[field] = msg;
  });
  return { errors, isValid: Object.keys(errors).length === 0 };
}

// Normalizes Supabase/Postgres errors into a message safe to show residents/officials.
export function friendlySupabaseError(error) {
  if (!error) return '';
  const msg = error.message || '';
  if (msg.includes('Email not confirmed')) {
    return 'Email not confirmed. Please check your email inbox to verify, or turn off "Confirm email" in Supabase Dashboard → Authentication → Providers → Email.';
  }
  if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) {
    return 'Incorrect email or password. Please verify your login credentials or sign up.';
  }
  const code = error.code;
  if (code === '23505') return 'That record already exists.';
  if (code === '23503') return 'This action references a record that no longer exists.';
  if (code === '42501' || msg.includes('row-level security')) {
    return "You don't have permission to do that.";
  }
  if (msg.includes('JWT') || msg.includes('session')) {
    return 'Your session expired. Please log in again.';
  }
  if (msg.includes('Failed to fetch')) {
    return 'Network error — check your connection and try again.';
  }
  return msg || 'Something went wrong. Please try again.';
}
