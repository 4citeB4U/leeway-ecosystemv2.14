/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.INDUSTRUES.PUBLIC.WEBSITE.TEST
TAG: LEEWAY.INDUSTRUES.PORTAL.SOURCE_QUALIFICATION.V1
5WH:
WHAT = Audit truth-first branding, source links, honest email contact, and no-touch mail DNS boundaries.
WHY = Prevent invented subscriptions, fake public product readiness or Northwest mail breakage during rebranding.
WHO = LeeWay site maintainers and independent source reviewers.
WHERE = tests/site-smoke.test.mjs
WHEN = 2026-10-28
HOW = Deterministic Node-only static fixture checks, no external access, accounts or mutations.
AUTHORITY: SOURCE TEST ONLY; does not certify live domain, OAuth, device control, Veritas or receipts.
LICENSE: Original validation source reserved to LeeWay owner.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../site/assets/styles.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../site/assets/app.js',import.meta.url),'utf8');
const doc=readFileSync(new URL('../site/README.md',import.meta.url),'utf8');
test('public brand spelling and evidence promise are exact',()=>{
 assert.match(html,/LeeWay IndusTrues/);
 assert.match(html,/Built on truth\. Proven by evidence\./);
 assert.match(html,/INDUS<span>TRUES<\/span>/);
 assert.doesNotMatch(html,/LeeWay Industries/);
 assert.match(doc,/historical technical authority names/i);
});
test('no fake account creation or newsletter signup exists',()=>{
 assert.match(html,/id="interest-form"/);
 assert.match(html,/id="consent"[^>]+required/);
 assert.match(html,/not a fictitious public service|does not create an account|not yet enabled/i);
 assert.match(js,/mailto:leonard\.lee@leewayindustrues\.com/);
 assert.match(js,/No signup has been saved here/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|document\.cookie/);
});
test('public products point to their actual canonical source',()=>{
 for(const part of ['Leeway-Maps','LEEWAY-LOGISTICS-','LeeWay-Digital-Workforce','LeeWay-Standards']){
   assert.ok(html.includes('https://github.com/4citeB4U/'+part),part);
 }
 assert.match(html,/SOURCE PROJECT/g);
 assert.match(html,/NOT LIVE CERTIFICATION/);
});
test('preview denies indexing and has no remote tracking assets',()=>{
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/\.\/assets\/styles\.css/);
 assert.match(html,/\.\/assets\/app\.js/);
 assert.doesNotMatch(html,/<script[^>]+src="https?:/);
 assert.match(css,/prefers-reduced-motion/);
});
test('Northwest site and email dependencies retained in release guide',()=>{
 for(const x of ['leewayindustrues.com','66.223.49.89','mailserver.businessidentity.llc','postal-r2i6fv._domainkey','DMARC','MX','SPF','wildcard','unverified']){
   assert.ok(doc.toLowerCase().includes(x.toLowerCase()),x);
 }
 assert.match(doc,/SPF includes a/);
 assert.match(doc,/never conflate/i);
});
