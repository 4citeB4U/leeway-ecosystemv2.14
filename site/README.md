<!--
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.INDUSTRUES.PUBLIC.PORTAL.DOCS
TAG: LEEWAY.INDUSTRUES.REBRAND_RELEASE_GUIDE.V1
5WH:
WHAT = Document the new IndusTrues public branding and static website release gates.
WHY = Preserve Northwest website/email DNS and LeeWay governance while changing the public name.
WHO = LeeWay IndusTrues public brand and authorized deployment operators.
WHERE = site/README.md
WHEN = 2026-10-28
HOW = Static deploy from GitHub, mailto requests, and DNS-owner verification before production cutover.
AUTHORITY: PRELAUNCH SOURCE ONLY; does not rename a legal entity, modify DNS, or provision Agent Lee.
LICENSE: Original site content reserved to the LeeWay creator.
-->
# LeeWay IndusTrues — public home

**Public-facing brand:** LeeWay IndusTrues.
**Exact registered domain:** leewayindustrues.com.
**Public slogan:** Built on truth. Proven by evidence.
**Supporting campaign message:** Not industry as usual.

IndusTrues is deliberately different from industries: TRUES highlights truth, governance, proof and accountability. Never correct the domain to leewayindustries.com. Historical technical authority names, repository identifiers, signed receipts and legal contract parties remain unchanged until they are independently and legally reconciled.

The website presents Agent Lee, LeeWay Maps, LeeWay Logistics and Digital Workforce with honest access/development status. No production-qualified status is inferred from its existence.

## Signup is voluntary email, not account enrollment

The public form currently prepares a voluntary email to leonard.lee@leewayindustrues.com. The visitor presses Send in their own email application. It stores no personal data on the website; it does not create a newsletter subscriber or Agent Lee account. Site copy explicitly states these limitations.

An actual native signup backend needs purpose-specific consent, email verification/double opt-in for newsletters, unsubscribe support, privacy/retention/deletion notice, bot prevention, encrypted durable storage and original Continuum ownership. This is an independent future implementation, not silently replaced by another database.

## Northwest DNS/mail preservation

LIVE DNS: UNVERIFIED. The owner supplied (not independently verified in live DNS) for leewayindustrues.com:
- Root, www, mail and wildcard A records: 66.223.49.89 (60-second TTL).
- MX: mailserver.businessidentity.llc, priority 10.
- SPF TXT: v=spf1 a mx include:spf.postal.businessidentity.llc ~all.
- DMARC TXT: v=DMARC1; p=quarantine; rua=mailto:bounce@dmarc.businessidentity.llc; ruf=mailto:bounce@dmarc.businessidentity.llc; fo=1.
- DKIM selector postal-r2i6fv._domainkey exists (value not supplied).
- CNAME psrp -> rp.postal.businessidentity.llc.
- Two _acme-challenge TXT records.
- Nameservers ns1.hosting.businessidentity.llc and ns2.hosting.businessidentity.llc (3600-second TTL).

If Northwest serves the new site, back up existing content, verify the exact document root, and upload only site/ contents. No DNS change is required if the actual service works.

If choosing Render or another external origin, verify preview and HTTPS first, then obtain exact owner authorization to change only website DNS records. Preserve mail A, MX, SPF, DKIM, DMARC, wildcard, psrp, ACME and existing TXT unless the original mail provider explicitly directs otherwise. **SPF includes a** which can be affected by changing the root A record; verify mail deliverability. No replacement database is justified by moving a public website.

rapidwebdevelop.com is a SEPARATE technical/historical domain under Cloudflare recovery; never conflate their nameservers, registrars or zones.


## Verified owner-provided mailbox client configuration (not a credential)

Business address: leonard.lee@leewayindustrues.com. This remains the public contact for the LeeWay IndusTrues site.

| Direction | Host | Port | Security | Auth |
| --- | --- | --- | --- | --- |
| IMAP inbound (recommended) | mailserver.businessidentity.llc | 993 | SSL/TLS | Full address and mailbox-specific password |
| POP3 inbound (optional) | mailserver.businessidentity.llc | 995 | SSL/TLS | Full address and mailbox-specific password |
| SMTP outbound | mailserver.businessidentity.llc | 465 | SSL/TLS | Full address and mailbox-specific password; authentication required |

These endpoint settings were supplied by Northwest's account assistant, not probed in a live email send/receive test. Do NOT put the mailbox password, webmail session tokens, or any login magic link in GitHub, public frontend JavaScript or hosting environment variables. The static website never logs into or sends directly from this mailbox.

For desktop use, configure an actual IMAP/SMTP client such as Outlook or Thunderbird. For mobile, the Gmail app supports third-party IMAP accounts. **Gmail on the web is not an IMAP inbox for third-party domains**: Google's incoming "Check mail from other accounts" was POP-based, no longer accepts new users after Q1 2026, and existing POP and third-party "Send as" connections are scheduled to end January 2027; do not build a production mailbox workflow around those features. Official: https://support.google.com/mail/answer/16604719 and https://support.google.com/mail/answer/17101213 .

Email deliverability tests required: inbound external sender → exact Northwest inbox; SMTP authenticated sender → independent destination; reply to sender; SPF/DKIM/DMARC pass via message headers; negative auth test; monitor bounce/junk. None are claimed completed.

## Real Render preview — separate from Northwest domain

On 2026-10-28 Render accepted the static preview named leeway-industrues-preview at https://leeway-industrues-preview.onrender.com . Deployment ID dep-dbh4u7mc6qcc73fseh80, service ID srv-dbh4u76c6qcc73fseg00, commit 6101c61e4069c9c8d9a792a1d7dfff3e824ead6e; Render reported deployment status LIVE. This is a hosted PREVIEW, not a Northwest DNS cutover, mailbox connectivity test, product enrollment, independent Veritas approval or permission to use live customer data. Auto-deploy was disabled.

## Deployment candidate

This is a standalone static site under site/ (index.html and assets). For Render static preview:
- Repo: 4citeB4U/leeway-ecosystemv2.14
- Candidate branch: brand/indus-trues-public-portal-20261028
- Build command: echo 'Static site; no build needed'
- Publish directory: site
- Autodeploy: disabled until separately qualified.
- Live URL: UNBOUND until actual deployment.

Robots meta and robots.txt intentionally block indexing until real domain/HTTPS/privacy/contact tests pass.

## Engineering loop

Investigate → Diagnose → Plan → Implement → Test → Validate → Repair → Retest → Verify → Evidence.

Node source tests do not prove a live signup, DNS cutover, mail deliverability, OAuth, Veritas approval or product readiness. Public pages may link to governed sources, but must never expose private Runtime Fabric, Continuum databases, Receipt Authority, Learning Ledger, GPU kernels or native device execution.
