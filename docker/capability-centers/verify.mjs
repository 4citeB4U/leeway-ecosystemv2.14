// REGION: LeeWay migration acceptance
// TAG: LEEWAY-CAPABILITY-CENTERS-VERIFY-V1
// WHO: Agent Lee; WHAT: live equivalence and failure checks; WHY: preserve contracts.
// WHERE: candidate; WHEN: before cutover; HOW: assert HTTP responses; ROLE: verifier; LICENSE: MIT.
import assert from "node:assert/strict";
const results = [];
for (let port = 8860; port <= 8863; port++) {
  for (const path of ["/health", "/registry", "/entities"]) {
    const old = await fetch("http://host.docker.internal:" + port + path);
    const next = await fetch("http://127.0.0.1:" + port + path);
    assert.equal(next.status, old.status);
    assert.deepEqual(await next.json(), await old.json());
    results.push({port, path, result: "PASS"});
  }
  const absent = await fetch("http://127.0.0.1:" + port + "/leeway-missing-route-test");
  assert.equal(absent.status, 404);
  const dispatch = await fetch("http://127.0.0.1:" + port + "/dispatch", {
    method: "POST", headers: {"content-type": "application/json"},
    body: JSON.stringify({diagnostic: true, execute: false})
  });
  assert.equal(dispatch.status, 202);
  assert.equal((await dispatch.json()).status, "DISPATCH_ACCEPTED_BY_CENTER_NOT_EXECUTED_DIRECTLY");
  results.push({port, failureRoute404: "PASS", dispatchAcknowledgementOnly: "PASS"});
}
console.log(JSON.stringify({status: "PASS", endpointComparisons: 12, negativeRoutes: 4, acknowledgementChecks: 4, results}));
