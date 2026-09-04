// Single source of truth for "who can edit what". Keep this in sync
// with the Postgres functions is_barangay_editor / is_sk_editor in schema.sql
// — the DB is the real gate (RLS), this is just for UI affordances.

export const ROLES = {
  CAPTAIN: 'captain',
  SECRETARY: 'secretary',
  TREASURER: 'treasurer',
  KAGAWAD: 'kagawad',
  STAFF: 'staff',
  SK_CHAIRPERSON: 'sk_chairperson',
  SK_TREASURER: 'sk_treasurer',
  SK_KAGAWAD: 'sk_kagawad',
};

// Seat quota limits per barangay
export const ROLE_SEAT_LIMITS = {
  [ROLES.CAPTAIN]: 1,
  [ROLES.KAGAWAD]: 7,
  [ROLES.SK_CHAIRPERSON]: 1,
  [ROLES.SK_KAGAWAD]: 7,
  [ROLES.SECRETARY]: 1,
  [ROLES.TREASURER]: 1,
  [ROLES.STAFF]: 1,
  [ROLES.SK_TREASURER]: 1,
};

export const BARANGAY_EDITOR_ROLES = [ROLES.CAPTAIN, ROLES.SECRETARY, ROLES.TREASURER];
export const SK_EDITOR_ROLES = [ROLES.SK_CHAIRPERSON, ROLES.SK_TREASURER];
export const SK_ROLES = [ROLES.SK_CHAIRPERSON, ROLES.SK_TREASURER, ROLES.SK_KAGAWAD];

export function isBarangayEditor(role) {
  return BARANGAY_EDITOR_ROLES.includes(role);
}

export function isSkEditor(role) {
  return SK_EDITOR_ROLES.includes(role);
}

export function isSkRole(role) {
  return SK_ROLES.includes(role);
}

export function roleLabel(role) {
  const labels = {
    captain: 'Barangay Captain',
    secretary: 'Barangay Secretary',
    treasurer: 'Barangay Treasurer',
    kagawad: 'Barangay Kagawad',
    staff: 'Barangay Staff',
    sk_chairperson: 'SK Chairperson',
    sk_treasurer: 'SK Treasurer',
    sk_kagawad: 'SK Kagawad',
  };
  return labels[role] || role;
}

