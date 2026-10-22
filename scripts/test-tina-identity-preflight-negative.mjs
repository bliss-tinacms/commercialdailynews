#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { validateIdentityEvidence } from './validate-tina-identity-preflight.mjs';

const baseline = JSON.parse(readFileSync(new URL('../migration/identity-preflight.json', import.meta.url), 'utf8'));
const cases = [
  ['simulated-401-cannot-downgrade-identity', { access_status: 'AUTH_BLOCKED', identity_status: 'PASS' }, null],
  ['simulated-403-cannot-downgrade-identity', { access_status: 'AUTH_BLOCKED', identity_status: 'PASS' }, null],
  ['missing-transcript-cannot-downgrade-identity', { transcript_output_available: false, identity_status: 'PASS' }, null],
  ['compacted-context-cannot-downgrade-identity', { context_compacted: true, identity_status: 'PASS' }, null],
  ['401-downgrade-is-rejected', { access_status: 'AUTH_BLOCKED', identity_status: 'BLOCKED' }, 'identity-not-preserved'],
  ['missing-saved-evidence-is-rejected', { saved_evidence_checked: false }, 'required-true:saved_evidence_checked'],
  ['wrong-organization-is-rejected', { organization: "Bliss Drive's Organization" }, 'wrong-organization'],
  ['rules-conflict-waiver-is-rejected', { rules_conflict_check: false }, 'required-true:rules_conflict_check'],
];
const results = [];
for (const [name, mutation, expectedFailure] of cases) {
  const failures = validateIdentityEvidence({ ...baseline, ...mutation });
  const passed = expectedFailure ? failures.includes(expectedFailure) : failures.length === 0;
  if (!passed) {
    console.error(JSON.stringify({ schema: 'tina-identity-preflight-negative-v1', status: 'FAIL', name, expectedFailure, failures }));
    process.exit(1);
  }
  results.push({ name, expectedFailure, observedFailures: failures, passed: true });
}
console.log(JSON.stringify({ schema: 'tina-identity-preflight-negative-v1', status: 'PASS', results }));
console.log('TINA_IDENTITY_PREFLIGHT_NEGATIVE_PASS');
