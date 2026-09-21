# papers

Open interface for accounting working papers and engagements.

**papers lets software and AI work with an engagement through portable accounting concepts — engagements, trial balances, adjustments, working papers, review notes — instead of one vendor's file format and field IDs.** Caseware is the first adapter.

> **Status:** early development. The concepts and the adapter contract are defined. The Caseware adapter is specified but not implemented, and every capability it reports is `false`. Treat this as infrastructure under construction, not production software.

## The idea

A compilation or a year end is the same shape of work everywhere: a trial balance arrives, accounts get grouped, balances get supported by evidence, questions get raised and cleared, adjustments get proposed and reviewed. The *concepts* are portable. Only the storage is not.

So `papers` separates three things:

**The concepts** — what an engagement is made of, in accounting terms. Nothing in `src/concepts` names a vendor, a file format or a field ID. When a concept cannot be expressed without one, it belongs in an adapter.

**The adapter contract** — what a given system can actually do, declared rather than assumed, and how a mutation is planned before it is performed.

**The adapters** — the translation, and the only place vendor specifics live.

## Two rules that shape the contract

**Capabilities are declared, never assumed.** A caller asks what an adapter supports before asking it to do anything. A desktop Working Papers bridge and a future Cloud adapter will not support the same set, and failing halfway through a write is not an option in a file a firm is professionally responsible for.

**`validate` is the default; `commit` is a separate decision.** Every mutation is planned first and returns what it *would* change, with the warnings a reviewer should see. Nothing reaches a firm's file until a caller asks for it explicitly — which in practice means an accountant did.

Two smaller ones fall out of the same concern. Money is integer minor units, because a trial balance has to tie exactly and floats do not. And every value carries where it came from — adapter, document, page, checksum — so a reviewer can get back to the source rather than trusting the number.

## Grouping is the firm's, not ours

`Account.group` is a free string on purpose.

Grouping numbers differ between firms, and between files at the same firm. There is no universal Caseware grouping to learn. A fixed enum here would quietly mistranslate one firm's 240 into another's, which is exactly the class of error nobody catches until a financial statement is wrong.

The mapping belongs to the firm's own methodology, informed by the prior-year file and the accounts themselves, and confirmed by a person when it is uncertain. `papers` carries it; it does not decide it.

## Reaching Caseware

Caseware is three surfaces, not one, and they do not answer the same questions.

| Surface | What it holds | Read | Write | What the firm needs |
|---|---|---|---|---|
| **Cloud API** | practice data — entities, users, engagements | ✅ | ✅ practice data | a Cloud site; credentials self-issued by the firm |
| **Sherlock** | **trial balance**, mappings, documents, issues | ✅ | ❌ | a separate Sherlock licence; files published to Cloud |
| **Desktop SDK** | Working Papers itself | ✅ | ✅ | an SDK licence, a signed annual SDK EULA — **and a partner agreement, for us** |

Under all three, the floor that works at any firm today: the firm's own export — GIFI, the Working Trial Balance to Excel, or Cloud's *Export to Working Papers (CSV ASCII)*. A person clicks it, we read the file, nothing is licensed.

**The Desktop SDK is not a path we can take alone.** Caseware's SDK licence is "not transferrable and cannot be used by third-party developers outside your firm", and does not permit development "for resale or distribution outside of the licensed firm". A bridge we author and hand to a firm is exactly that, whoever's licence it runs under. It needs the firm's own people, or a partner agreement.

So the order is: exports, then the Cloud API, then Sherlock for the trial balance, then the desktop only behind an agreement. **[docs/caseware-surface.md](docs/caseware-surface.md)** has the detail and the sources.

What does not change is the credential boundary. Working Papers is a desktop application — firms run it on Windows, often through Citrix, against a network share — so where a desktop path is taken it is taken by something running inside the firm's environment, beside the files:

```
papers (MCP)  →  adapter  →  documented bridge protocol
                                        │
                 ── firm environment ───┼───────────────
                                        ▼
                             bridge  →  Working Papers
```

The protocol and the adapters are ours and are open. Anything linking Caseware's own SDK is not distributed from here at all.

**Before using any of this across more than one firm, read [docs/security.md](docs/security.md).** Caseware's API Usage Policy permits a customer to engage a third-party developer for its own internal purposes, and separately requires a formal partner review and written approval before an integration is commercialized or offered to multiple firms.

## Install

```bash
npm install
npm run build
```

Run the MCP server over stdio:

```bash
PAPERS_ADAPTER=caseware npm start
```

With no `PAPERS_ADAPTER`, the server starts and reports no capabilities — useful for inspecting the tool surface without touching a firm's files.

## Related

[fisc](https://github.com/coalesc/fisc) — the same idea for professional tax software: Taxprep, DT Max.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
