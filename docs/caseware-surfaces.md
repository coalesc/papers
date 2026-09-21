# What can actually be reached in Caseware

Caseware is not one system with one door. It is three surfaces with different transports, different licences and very different answers to "can we use this?" — and the plan this repository carried until now assumed the wrong one.

## The three surfaces

| | What it holds | Transport | What a firm needs | Read | Write |
|---|---|---|---|---|---|
| **Cloud API** | practice data — entities, users, groups, roles, engagements | REST, OAuth2 client credentials | a Caseware Cloud site; credentials self-issued at Firm Settings → Integration | ✅ | ✅ for practice data |
| **Sherlock** | engagement data — **trial balance**, mappings, documents, issues | REST | a **separate Sherlock licence**, plus Working Papers files published to Cloud | ✅ | ❌ |
| **Desktop SDK** | Working Papers itself — accounts, balances, adjusting entries, documents, groupings | COM, on Windows, beside the file | an SDK add-on licence **and a signed annual SDK EULA** | ✅ | ✅ |

## Why the plan changed

The earlier plan was a bridge: a small service we write, running on the firm's Windows box, holding the firm's own Caseware SDK licence, so that Coalesc never touches a Caseware credential. The credential reasoning was right. The licensing reasoning was not.

Caseware's own SDK documentation states that the SDK licence **"is not transferrable and cannot be used by third-party developers outside your firm"**, that it is **"intended strictly for use by the licensed client and is not made available to third-party developers"**, and that it **"does not permit the development of templates, scripts, etc. for resale or distribution outside of the licensed firm."** Every SDK client signs an annual SDK EULA to that effect.

A bridge we author and hand to a firm is development by a third-party developer, distributed to the licensed firm from outside it. Holding the firm's licence rather than our own does not change that — the restriction is on who develops and where the result goes, not on whose key is in the machine.

So the Desktop SDK is not a path we can take alone. It needs either the firm's own people building against their own licence, or a partner agreement with Caseware.

## What is reachable without that conversation

**Sherlock is the trial balance**, and it was written off here too early. It is a real REST API over `trialbalance` and `mapping` datasets, plus documents and issues, and it needs no SDK EULA and no partner review — only a licence the firm buys from Caseware directly, like any other module.

Three things to know before building on it:

- **It is read-only.** Nothing goes back into an engagement through Sherlock.
- **Extraction is nightly**, from files published to Cloud. It is a reporting warehouse, not a live view of what a preparer is doing right now. A balance read at 09:00 is last night's balance.
- **The firm must publish** its Working Papers files to Cloud. Firms that keep everything on a network share have nothing in Sherlock to read.

**The Cloud API** covers the practice, not the engagement's numbers: entities, users, engagements, permissions. Credentials are self-issued by the firm. It is the right surface for "which engagements exist and who is on them", and the wrong one for a trial balance.

**And under both, the floor: the firm's own export.** `Engagement > Export > GIFI`, the Working Trial Balance saved to Excel, or Cloud's *Export to Working Papers (CSV ASCII)* — the format Caseware itself uses to move a trial balance between Cloud and desktop. A person clicks it, we read the file, nothing is licensed and nothing is integrated. Every third-party integration shipped in this market today is some version of this, which is worth remembering before treating it as a stopgap.

## The order this suggests

1. **Exports.** Works today, at any firm, with no licence conversation. Proves the concepts and the mapping work against real files.
2. **Cloud API** where a firm is on Cloud — practice structure, self-serve credentials.
3. **Sherlock** where a firm has it or will buy it — the trial balance, read-only, nightly.
4. **Desktop SDK** only behind a partner agreement, or built by the firm's own staff against their own licence.

None of this changes [the credential boundary](security.md): whatever the surface, credentials stay in the firm's environment and this repository holds none.

## Sources

Read these rather than this page, in the version in force when you deploy:

- API Usage Policy — <https://www.caseware.com/legal/api-usage-policy>
- Developer portal (index public, reference pages gated) — <https://developers.caseware.com/>
- Sherlock — <https://www.caseware.com/docs/en/cloud/sherlock/>
