# Security and licensing boundaries

This library writes into files a firm is professionally responsible for. Two boundaries matter more than anything else in the code.

## 1. Nothing is written without a decision

Every mutation takes a `mode`.

- `validate` — the default. Returns what *would* change, and the warnings a reviewer should see. Changes nothing.
- `commit` — performs the write.

A caller that never passes `commit` cannot alter a firm's file, whatever else it does. Automation is expected to plan in `validate` and hand the result to a person; the accountant's approval is the thing that turns a plan into a write.

Adapters declare `idempotent_writes`. When true, `commit` requires an `idempotency_key` that is stable across retries of the same logical write. When false, **callers must not retry a write automatically** — a duplicated journal entry in a client's file is worse than a failed one.

## 2. Credentials stay inside the firm

The Caseware adapter does not hold credentials, reach a network share, or link any vendor SDK. It speaks to a bridge running inside the firm's own environment, which holds all of that.

```
                          firm environment
                    ┌───────────────────────────┐
papers  →  adapter  │  bridge  →  Working Papers │
                    │     ↑                     │
                    │  credentials, SDK,        │
                    │  network share            │
                    └───────────────────────────┘
```

This keeps the open-source surface free of anything licensed, and keeps the licensed, credential-holding component in the one place a firm controls and can audit.

## 3. Caseware's API Usage Policy

Read the policy before deploying this anywhere: <https://www.caseware.com/legal/api-usage-policy>

Three clauses govern how this adapter may be used.

**A customer may engage a third-party developer** where "the work is performed solely on the customer's behalf and for the customer's internal business purposes", and "the customer remains responsible for all access granted and all activity conducted using the customer's API credentials."

**Credentials are single-organization.** They "must not be used to provide services to other organizations or to support any multi-tenant deployment, unless Caseware expressly authorizes otherwise in writing."

**Commercialization requires prior approval.** "If a third party intends to commercialize, broadly promote, or offer an integration to multiple firms or other organizations… Caseware requires completion of a formal partner review and written approval prior to any commercialization or broad promotion."

What that means in practice:

| | |
|---|---|
| One firm, its own credentials, its own environment, its own purposes | Permitted under the third-party developer clause |
| The same deployment serving a second firm | Not permitted without written authorization |
| Any multi-tenant hosting of this adapter | Not permitted without written authorization |
| Offering or promoting the integration to firms generally | Formal partner review and written approval first |

Unapproved third parties also do not receive partner-specific documentation or sandbox environments — so the partner review is not only a legal step, it is how the tooling to build this properly is obtained.

## 4. What belongs in this repository

**Here:** the concepts, the adapter contract, the adapters we write, and the bridge *protocol* — the documented shape of the conversation.

**Not here:** any vendor SDK, any code linking one, credentials, connection strings, firm data, client data, or anything else covered by a vendor's proprietary license.

If a vendor permits the bridge implementation to be opened, it can move here. Until then the protocol stays open and the implementation is distributed separately.

## Reporting a vulnerability

<hello@coalesc.ai>. Please do not open a public issue for a security report.
