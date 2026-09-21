# What the Caseware surface actually is

> Researched 2026-09-07. Every claim is marked **documented** (read on a Caseware primary
> source), **inferred**, or **unverified**. Two documentation pages returned 403 and are noted
> where that matters.
>
> This file is about **mechanism**. For what a firm is permitted to do with it, read
> [security.md](security.md) first — the constraint on this integration is contractual, not
> technical, and it is the one that decides how the bridge may be deployed.

## The short version

There is a real integration surface, and it is better than the "no API" reputation suggests. But
**no third party has a live API connection into Working Papers.** Every shipped integration by
another vendor is a file a human exported from the Caseware UI — including Silverfin's and
MindBridge's, whose support articles are titled, respectively, *"How can I export the trial
balance from Caseware?"* and *"Export a Caseware classified trial balance"*. The one smooth path,
TaxCycle, exists because **Caseware built the exporter**, not because TaxCycle called an API.

That shapes the sequencing: the file path works today and needs nobody's permission; the COM path
needs a licence the firm buys; the multi-tenant path needs Caseware's signature.

## Working Papers desktop — the COM API

**Documented.** Working Papers exposes a COM automation server. The object model root is
`CWApplication`:

```js
var Application = new ActiveXObject("CaseWare.Application");
Client = Application.Clients.Open2(filePath, username, password, openFlags);
Client.Accounts("100").Balances.Opening;         // read
Client.Accounts.Get("101").Name = "Petty Cash";  // write
Client.CloseCompressed2(CWCompressFlags.cDefault);
```

Documented reachable areas: **accounts, account balances, adjusting journal entries, client
profile, documents, mappings and groupings, custom metadata, FX rates, trial balance data.**
Classes include `CWAccount(s)`, `CWAccountBalances`, `CWAdjustingEntries`, `CWDocument(s)`,
`CWClient(s)`. Caseware's own summary: *"External Applications — COM interface for building
desktop or server applications that access engagement files, trial balances, journal entries, and
client data."*

So read/write of a trial balance, and access to a Documents collection, are **documented
capability**.

**Unverified, and it matters for the write path:** the exact call to attach an *external* file
(a PDF) as a document. The `CWDocuments` class detail pages returned 403. Treat "attach a PDF via
COM" as highly likely but unconfirmed — one hour with the SDK documentation settles it, and it is
worth doing before promising a write-back capability.

**The licence, and it is the hard dependency.** The Desktop SDK is a **paid add-on to an existing
Working Papers licence**, "intended strictly for use by the licensed client". It *"does not permit
the development of templates, scripts, etc. for resale or distribution outside of the licensed
firm"* and *"cannot be used by third-party developers outside your firm"*. **Price is not
published anywhere.**

This is why the bridge in the README is drawn the way it is: the SDK licence and the credentials
live with the firm, and the distributable part must not link the SDK.

## Caseware Cloud — the REST API

**Documented.** REST, JSON, OAuth 2.0 **client credentials** flow, `POST /auth/token`, 30-minute
tokens, token-bucket rate limiting with `x-ratelimit-*` headers, HTTP 429 on exhaustion. The
**firm** mints its own credentials at *Firm Settings → Integration*, maximum 50 API clients, each
assigned roles and Read-only or Full access. **No partner agreement is needed for a firm to create
a key for itself.**

**But the public documentation is three pages**, covering `entities`, `users`, `roles`,
`engagements` and metadata — practice-management objects. The full endpoint reference is
tenant-gated at `https://{region}.casewarecloud.com/{firm}/sdk`.

**Nothing public documents a trial-balance or document-attachment endpoint.** That does not prove
none exists behind the tenant SDK page; it proves you cannot plan against one from outside.
Anyone who says "Caseware Cloud has a documented API for attaching working papers" is going beyond
the public record.

## The file path — what works today, with no SDK and no conversation

**Documented import formats** (`Engagement > Import`): Caseware Working Papers **`.ac`**, **ASCII
(`.txt`, `.csv`, `.rtf`, `.prn`)**, **Excel** (`.xls`, `.xlsx`, `.xlsm`, …), **XBRL**, **Auditfile
XML**, plus a wizard for named accounting packages. Prerequisite: the trial balance is blank, or
account numbers match.

**Documented export paths:**

| From | Path | Produces |
|---|---|---|
| Working Papers | Working Trial Balance → right-click → Save as Excel | `.xlsx` |
| Cloud | Data → Export | CSV, PDF, **Export to Working Papers (CSV ASCII)** |
| Cloud | Groups → Tabular Excel Export | `.xlsx` |
| Working Papers | `Engagement > Export > GIFI` | `.GFI`, or direct TaxCycle `.T2` / ProFile `.GT2` |
| Working Papers | `Engagement > Export > Tax Software…` | Taxprep `.tt` |

**"Working Papers (CSV ASCII)" is the round-trip format** — it is what Caseware itself uses to move
a trial balance between Cloud and desktop. That makes it the most defensible interchange target
for an adapter that wants to be correct rather than clever.

All of the above are **documented as UI operations**. Driving them programmatically means COM
(desktop, licensed) or possibly the tenant-gated Cloud SDK.

**GIFI is the de facto Canadian interchange** between a trial balance and a corporate tax return —
Caseware writes it, and DT Max's own knowledge base confirms reading it: *"Standard GIFI files
produced by third party software such as Caseware or Simply Accounting can be imported into DT
Max."* Two limits worth stating plainly: **GIFI is T2 only**, so it does nothing for a T1 practice;
and **the CRA publishes GIFI codes, not the `.GFI` interchange layout** — that is a de-facto
convention shared between vendors. One sample file from a real firm settles the layout.

## Why `Account.group` is a free string — now with evidence

The README argues that grouping belongs to the firm and not to this library. The mechanism
confirms it rather than merely permitting it.

Caseware's model is a **mapping database**: a firm master chart of accounts with pre-assigned
properties, where connecting a client account to a map number *"automatically completes"* that map
number's properties. **Map numbers are 8-digit, `XXX.XXX.XX`, with three hierarchical components**
(main grouping → sub-category → industry or client granularity), and parent map numbers auto-sum
their children. Caseware ships a default database, **but firms design their own, and often need
several by industry.**

Two consequences for this repository:

1. **There is no universal Caseware grouping to learn.** A fixed enum here would mistranslate one
   firm's `240` into another's — the exact failure the README names.
2. **The map number already carries the leadsheet grouping.** In Caseware, the mapping *is* the
   caption assignment. So an adapter that reads a mapped trial balance is reading the firm's
   grouping decision, not making one. That is what `Account.group` should carry, verbatim, and
   why it must not be interpreted.

## Not a bridge, whatever it looks like

**SmartSync is not an integration surface.** It is proprietary internal replication between
Caseware installations: a hidden sync folder, an operation log, deltas to a top-level parent, port
50412 for presence. There is no documented third-party protocol. Do not model against it.

**The `.ac` / `.ac_` engagement file has no published format specification**, and no evidence was
found that anyone has reverse-engineered it. A common suggestion to "just read the Btrieve tables"
goes beyond the evidence: Caseware's Pervasive/Btrieve documentation concerns *source* accounting
systems being imported **from**, not Working Papers' own storage.

## What this implies for the adapter's capabilities

The repository's rule is that capabilities are declared and never assumed. The surface above maps
onto that directly:

- A **file-only** deployment can honestly report read of a trial balance and nothing else. It needs
  no SDK, no credentials and no Caseware relationship. It is what other vendors ship today.
- A **bridge** deployment can additionally report account, balance and adjusting-entry writes,
  because the COM API documents them — with document attachment held back until the `CWDocuments`
  question above is answered rather than declared true on optimism.
- Neither should report a capability that depends on the Cloud REST API for trial balances or
  documents, because no public documentation establishes one.

## Sherlock — the trial balance, and it is not the SDK

Written off too early elsewhere. **Caseware Sherlock** exposes a REST API over `trialbalance`
and `mapping` datasets, plus documents and issues, and pushes them to tools like Power BI.
It needs **no SDK EULA and no partner review** — only a licence the firm buys from
`my.caseware.com` like any other module.

Three things decide whether it is usable at a given firm:

- **It is read-only.** Nothing returns to an engagement through Sherlock, so
  `write_*` stays `false` on any adapter built on it, permanently.
- **Extraction is nightly**, from files published to Cloud. It is a reporting warehouse, not
  a live view. A balance read at 09:00 is last night's, and an adapter must say so rather
  than implying otherwise.
- **The firm must publish to Cloud.** A firm keeping everything on a network share has
  nothing in Sherlock to read — detect that and report it, never return an empty balance.

## 🚨 The Desktop SDK is closed to us, not merely expensive

The section above treats the SDK add-on licence as a cost. It is also a prohibition, and
that changes the plan rather than its budget. Caseware's own SDK documentation:

> "The CaseWare SDK license is available as an add-on license to some existing Working
> Papers clients and is intended strictly for use by the licensed client and is **not made
> available to third-party developers**."

> "The SDK license is not transferrable and **cannot be used by third-party developers
> outside your firm**."

> "does not permit the development of templates, scripts, etc. for resale or distribution
> outside of the licensed firm."

Every SDK client signs an annual SDK EULA to that effect.

**A bridge we author and hand to a firm is exactly that** — development by a third-party
developer, distributed to the licensed firm from outside it. Holding the firm's licence
rather than our own does not change it: the restriction is on who develops and where the
result goes. The desktop path needs the firm's own people building against their own
licence, or a partner agreement with Caseware.

## The order this implies

1. **Exports.** Work today, at any firm, with no licence conversation. Prove the concepts
   and the mapping against real files first.
2. **Cloud API** where a firm is on Cloud — practice structure, credentials the firm issues
   itself.
3. **Sherlock** where a firm has it or will buy it — the trial balance, read-only, nightly.
4. **Desktop SDK** only behind a partner agreement, or built by the firm's own staff.

None of it changes the credential boundary in [security.md](security.md): whatever the
surface, credentials stay in the firm's environment and this repository holds none.

## Sources

[API Usage Policy v3.0](https://www.caseware.com/legal/api-usage-policy) ·
[Desktop SDK overview](https://uk.casewarecloud.com/uk-se-develop/p/documentation/desktop/Content/Reference/guide/getting-started.html) ·
[Working Papers COM guide](https://uk.casewarecloud.com/uk-se-develop/p/documentation/desktop/Content/Reference/guide/workingpapers-getting-started-guide.html) ·
[COM module reference](https://uk.casewarecloud.com/uk-se-develop/p/documentation/desktop/Content/Reference/modules/CaseWare.html) ·
[Cloud API — getting started](https://www.caseware.com/docs/en-us/cloud/caseware-cloud/cloud-api/get-started-with-cloud-api) ·
[Cloud API — common use cases](https://www.caseware.com/docs/en/cloud/caseware-cloud/cloud-api/common-use-cases) ·
[Cloud API settings](https://www.caseware.com/docs/en/cloud/caseware-cloud/api-settings) ·
[Cloud trial balance & adjustments export](https://www.caseware.com/docs/en/cloud/caseware-cloud/engagement-management/accounts-and-analysis/export-adjustments-and-trial-balance-data) ·
[Importing a trial balance](https://documentation.caseware.com/latest/Audit/en/Content/User_Client_File_Setup/t_Using_the_Import_Feature.htm) ·
[Export to GIFI](https://www.caseware.com/docs/en/desktop/working-papers/practice/tax-canada/export-gifi) ·
[Export to Taxprep](https://www.caseware.com/docs/en/desktop/working-papers/practice/tax-canada/export-taxprep) ·
[About mapping](https://documentation.caseware.com/2023/WorkingPapers/en/Content/Engagements/Trial-Balance/Mapping-Grouping/About-Mapping.htm) ·
[Assigning map numbers](https://documentation.caseware.com/2016/WorkingPapers/en/Content/Accounting_and_Assurance/Working_Trial_Balance/Mapping_and_Grouping/t_Assigning_map_numbers_to_accounts.htm) ·
[About SmartSync](https://documentation.caseware.com/2024/WorkingPapers/en/Content/Setup/Environments-Configuration/CaseWare-SmartSync/About-SmartSync.htm) ·
[Imports and Pervasive SQL](https://www.caseware.com/docs/en/desktop/working-papers/engagements/imports/imports-pervasive-sql) ·
[TaxCycle × Caseware](https://www.taxcycle.com/caseware/) ·
[DT Max GIFI import](https://support.drtax.ca/dtmax/eng/kb/dtmax/DT%20Max%20help%20directory/T2/w506.htm)

**Vendor identities, corrected:** Taxprep and Cantax are **Wolters Kluwer**, not Thomson Reuters.
TaxCycle is owned by **Xero**. DT Max is Thomson Reuters.
