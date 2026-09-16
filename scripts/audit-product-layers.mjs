/**
 * $layer-steward audit — diff the catalog layer registry against every product
 * manifest. Reports layers in code but not in a manifest, manifest entries with
 * no matching layer, and disabled entries missing a reason. Exit 1 on any
 * finding (release-captain consumes the JSON from stdout).
 */
import { readFile } from 'node:fs/promises';
import { LAYER_STATE_REGISTRY } from '../src/data/layerState.js';

const registryIds = LAYER_STATE_REGISTRY.map((entry) => entry.id);
const manifest = JSON.parse(
  await readFile(new URL('../data/product-layers.manifest.json', import.meta.url), 'utf8'),
);

const findings = [];
for (const [product, config] of Object.entries(manifest.products)) {
  const manifestIds = Object.keys(config.layers);
  for (const id of registryIds) {
    if (!manifestIds.includes(id))
      findings.push({ product, layer: id, finding: 'in-code-not-in-manifest' });
  }
  for (const id of manifestIds) {
    if (!registryIds.includes(id))
      findings.push({ product, layer: id, finding: 'in-manifest-not-in-code' });
  }
  for (const [id, entry] of Object.entries(config.layers)) {
    if (entry.enabled === false && !entry.reason)
      findings.push({ product, layer: id, finding: 'disabled-without-reason' });
    if (entry.reason === 'unused')
      findings.push({ product, layer: id, finding: 'reason-is-unused' });
  }
}

const report = {
  agent: 'layer-steward',
  status: findings.length ? 'fail' : 'pass',
  scope: ['LAYER_STATE_REGISTRY vs data/product-layers.manifest.json'],
  evidence: { registryCount: registryIds.length, findings },
  blocking: Boolean(findings.length),
  handoff: null,
  notes: [
    `${registryIds.length} registry layers checked against ${Object.keys(manifest.products).length} product manifests.`,
  ],
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = findings.length ? 1 : 0;
