#!/usr/bin/env node

/**
 * papers — an MCP server over accounting working papers.
 *
 * Read tools are always present. Write tools exist but refuse unless the
 * configured adapter declares the matching capability, and every one of them
 * defaults to `validate`: they return what *would* change and change nothing.
 * Committing is a separate call a caller has to mean.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CasewareBridgeAdapter } from "./adapters/caseware/index.js";
import type { Capabilities, EngagementAdapter, Mode } from "./adapters/types.js";

const server = new McpServer({ name: "papers", version: "0.1.0" });
const modeSchema = z.enum(["validate", "commit"]);

function loadAdapter(): EngagementAdapter | undefined {
	switch (process.env.PAPERS_ADAPTER) {
		case "caseware":
			return new CasewareBridgeAdapter({
				endpoint: process.env.PAPERS_CASEWARE_BRIDGE ?? "http://127.0.0.1:7801",
			});
		case undefined:
		case "":
			return undefined;
		default:
			throw new Error(`Unknown PAPERS_ADAPTER: ${process.env.PAPERS_ADAPTER}`);
	}
}

const adapter = loadAdapter();

function text(value: unknown) {
	return {
		content: [
			{
				type: "text" as const,
				text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
			},
		],
	};
}

function failure(error: unknown) {
	return text({
		ok: false,
		error: error instanceof Error ? error.message : String(error),
	});
}

function requireAdapter(): EngagementAdapter {
	if (!adapter) {
		throw new Error(
			"No engagement adapter is configured. Set PAPERS_ADAPTER once a supported bridge is available.",
		);
	}
	return adapter;
}

/**
 * Refuse before acting, not halfway through.
 *
 * A write that begins against a system which cannot finish it leaves a firm's
 * file in a state nobody chose.
 */
function requireCapability(cap: keyof Capabilities, method: keyof EngagementAdapter): EngagementAdapter {
	const a = requireAdapter();
	if (!a.capabilities()[cap]) {
		throw new Error(`Adapter "${a.name}" does not support ${cap}.`);
	}
	// A capability is a promise the adapter makes about itself, and an adapter
	// that declares one without implementing the method is lying in the only
	// direction that matters. Caught here, the caller gets a sentence naming the
	// bug; without it, the optional-call returns undefined and the failure
	// surfaces as an unrelated serialization error somewhere downstream.
	if (typeof a[method] !== "function") {
		throw new Error(
			`Adapter "${a.name}" declares ${cap} but does not implement ${String(method)}. This is an adapter bug.`,
		);
	}
	return a;
}

server.tool(
	"get_capabilities",
	"Describe the configured adapter and what it supports",
	{},
	async () => {
		if (!adapter) {
			return text({ adapter: null, capabilities: null });
		}
		return text({ adapter: adapter.name, capabilities: adapter.capabilities() });
	},
);

server.tool("list_engagements", "List engagements visible to the adapter", {}, async () => {
	try {
		const a = requireCapability("read_engagements", "listEngagements");
		return text(await a.listEngagements?.());
	} catch (error) {
		return failure(error);
	}
});

server.tool(
	"get_trial_balance",
	"Read a trial balance for an engagement",
	{
		engagement_id: z.string(),
		as_of: z.string().optional().describe("ISO 8601 date; defaults to period end"),
	},
	async ({ engagement_id, as_of }) => {
		try {
			const a = requireCapability("read_trial_balance", "getTrialBalance");
			return text(await a.getTrialBalance?.(engagement_id, as_of));
		} catch (error) {
			return failure(error);
		}
	},
);

server.tool(
	"list_review_notes",
	"Read the review notes on an engagement",
	{ engagement_id: z.string() },
	async ({ engagement_id }) => {
		try {
			const a = requireCapability("read_review_notes", "listReviewNotes");
			return text(await a.listReviewNotes?.(engagement_id));
		} catch (error) {
			return failure(error);
		}
	},
);

server.tool(
	"propose_adjustment",
	"Plan an adjusting entry. Defaults to validate: nothing is written unless mode is commit.",
	{
		engagement_id: z.string(),
		description: z.string(),
		rationale: z.string().optional().describe("Why this entry exists, for the reviewer"),
		lines: z
			.array(
				z.object({
					account_code: z.string(),
					amount: z.number().describe("Minor units; positive debit, negative credit"),
					currency: z.string().default("CAD"),
				}),
			)
			.describe("Lines must sum to zero"),
		mode: modeSchema.default("validate"),
		idempotency_key: z.string().optional(),
	},
	async ({ engagement_id, description, rationale, lines, mode, idempotency_key }) => {
		try {
			const a = requireCapability("write_adjustments", "proposeAdjustment");
			// Checked here rather than in the adapter: an entry that does not
			// balance is wrong in every accounting system there is, so no adapter
			// should have to discover it independently.
			const sum = lines.reduce((n, l) => n + l.amount, 0);
			if (sum !== 0) {
				throw new Error(`Adjustment does not balance: lines sum to ${sum}, expected 0.`);
			}
			if (a.capabilities().idempotent_writes && mode === "commit" && !idempotency_key) {
				throw new Error("This adapter requires an idempotency_key to commit a write.");
			}
			return text(
				await a.proposeAdjustment?.(
					{
						engagement_id,
						description,
						rationale,
						lines: lines.map((l) => ({
							account_code: l.account_code,
							amount: { amount: l.amount, currency: l.currency },
						})),
					},
					mode as Mode,
					idempotency_key,
				),
			);
		} catch (error) {
			return failure(error);
		}
	},
);

const transport = new StdioServerTransport();
await server.connect(transport);
