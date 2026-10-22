#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const requiredTrueFields = [
  'tracker_checked',
  'saved_evidence_checked',
  'organization_switcher_checked',
  'positive_identity_preserved',
  'auth_separated_from_existence',
  'rules_conflict_check',
];

export function validateIdentityEvidence(evidence) {
  const failures = [];
  if (evidence?.schema !== 'tina-identity-preflight-v1') failures.push('invalid-schema');
  for (const field of requiredTrueFields) {
    if (evidence?.[field] !== true) failures.push(`required-true:${field}`);
  }
  if (evidence?.organization !== "bliss-tinacms's Organization") failures.push('wrong-organization');
  if (evidence?.project !== 'commercialdailynews') failures.push('wrong-project');
  if (evidence?.repository !== 'bliss-tinacms/commercialdailynews') failures.push('wrong-repository');
  if (evidence?.site_url !== 'https://www.commercialdailynews.com') failures.push('wrong-site-url');
  if (!String(evidence?.client_identity || '').startsWith('verified-')) failures.push('unverified-client-identity');
  if (evidence?.identity_status !== 'PASS') failures.push('identity-not-preserved');
  if (!['SEPARATE_CHECK', 'PASS', 'AUTH_BLOCKED'].includes(evidence?.access_status)) failures.push('invalid-access-status');
  // Access failure is deliberately orthogonal to proven identity.
  if (['401', '403', 401, 403].includes(evidence?.access_status)) failures.push('raw-auth-code-used-as-identity-status');
  return failures;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
  const evidencePath = resolve(process.argv[2] || 'migration/identity-preflight.json');
  let evidence;
  try {
    evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
  } catch (error) {
    console.error(JSON.stringify({ schema: 'tina-identity-preflight-result-v1', status: 'BLOCKED', failures: [`unreadable-evidence:${error.message}`] }));
    process.exit(2);
  }
  const failures = validateIdentityEvidence(evidence);
  const result = {
    schema: 'tina-identity-preflight-result-v1',
    status: failures.length ? 'BLOCKED' : 'PASS',
    project: evidence.project,
    organization: evidence.organization,
    identity_status: evidence.identity_status,
    access_status: evidence.access_status,
    failures,
  };
  console.log(JSON.stringify(result));
  if (failures.length) process.exit(2);
  console.log('TINA_IDENTITY_PREFLIGHT_PASS');
}
