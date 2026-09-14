import assert from "node:assert/strict";
import test from "node:test";

import { extractValuations, updateIndexHtml } from "../scripts/update-tpg-valuations.mjs";

const fixture = `
  <table>
    <tr><th>Program</th><th>September 2026 valuation</th></tr>
    <tr><td>Chase Ultimate Rewards</td><td><span>2.05</span></td></tr>
    <tr><td>Alaska Airlines Atmos Rewards</td><td><strong>1.55*</strong></td></tr>
    <tr><td>Delta SkyMiles</td><td>1.2*</td></tr>
    <tr><td>Marriott Bonvoy</td><td>0.75**</td></tr>
  </table>
`;

test("extracts the current TPG month and supported program values", () => {
  assert.deepEqual(extractValuations(fixture), {
    month: "Sep 2026",
    bonvoy: 0.75,
    alaska: 1.55,
    delta: 1.2,
    chase: 2.05
  });
});

test("updates defaults and appends one history entry", () => {
  const input = `var DEFAULTS = { valBonvoy: 0.84, valAlaska: 1.40, valDelta: 1.20, valChase: 2.05, certCap: 35000 };
  var HISTORY = [
    { month: "Jun 2026", bonvoy: 0.84, alaska: 1.40, delta: 1.20, chase: 2.05 }
  ];`;
  const valuations = extractValuations(fixture);
  const once = updateIndexHtml(input, valuations);
  const twice = updateIndexHtml(once, valuations);

  assert.match(once, /valBonvoy: 0\.75, valAlaska: 1\.55/);
  assert.equal((once.match(/month: "Sep 2026"/g) ?? []).length, 1);
  assert.equal(twice, once);
});

test("rejects incomplete source data", () => {
  assert.throws(
    () => extractValuations(fixture.replace("Marriott Bonvoy", "Missing Program")),
    /Marriott Bonvoy/
  );
});
