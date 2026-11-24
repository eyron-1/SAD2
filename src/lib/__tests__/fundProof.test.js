import test from 'node:test';
import assert from 'node:assert/strict';
import { getFundProofUrl } from '../fundProof.js';

test('gets a fund proof URL from the proof column or legacy description', () => {
  const savedProof = 'https://storage.example/fund-proof.png';
  assert.equal(getFundProofUrl({ proof_url: savedProof }), savedProof);
  assert.equal(
    getFundProofUrl({ description: `Grant details\n[Proof of Funds: ${savedProof}]` }),
    savedProof,
  );
  assert.equal(getFundProofUrl({ description: '[Proof of Funds: not-a-url]' }), null);
});
