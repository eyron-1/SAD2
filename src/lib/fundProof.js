const WEB_URL_PATTERN = /^https?:\/\/\S+$/i;
const LEGACY_PROOF_PATTERN = /\[Proof of Funds:\s*(https?:\/\/[^\s\]]+)\s*\]/i;

export function getFundProofUrl(row) {
  if (WEB_URL_PATTERN.test(row?.proof_url || '')) return row.proof_url;

  const legacyProof = row?.description?.match(LEGACY_PROOF_PATTERN);
  return legacyProof?.[1] || null;
}
