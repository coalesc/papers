/**
 * The adapter contract.
 *
 * Two rules shape everything here, and both come from the same place: this
 * library writes into files that firms are professionally responsible for.
 *
 * 1. **Capabilities are declared, never assumed.** A caller asks what an adapter
 *    can do before asking it to do anything. A Caseware Working Papers bridge on
 *    a Windows desktop and a future Cloud adapter will not support the same set,
 *    and silently failing halfway through a write is not an option.
 *
 * 2. **`validate` is the default; `commit` is a separate decision.** Every
 *    mutation is planned first and returns what it *would* change. Nothing
 *    reaches a firm's file until a caller — which in practice means an
 *    accountant — asks for it explicitly.
 */

import type {
	Adjustment,
	Engagement,
	ReviewNote,
	SourceRef,
	TrialBalance,
	Workpaper,
} from "../concepts/index.js";

/** What an adapter supports. Absent means unsupported, never "probably". */
export interface Capabilities {
	read_engagements: boolean;
	read_trial_balance: boolean;
	read_workpapers: boolean;
	read_review_notes: boolean;
	/** Write paths are separate: many environments are read-only by policy. */
	write_adjustments: boolean;
	write_workpapers: boolean;
	write_review_notes: boolean;
	/**
	 * Whether the adapter can prove a write happened exactly once.
	 *
	 * Without this, a retried adjustment can post twice, and a duplicated
	 * journal entry in a client's file is worse than a failed one. A caller
	 * that sees `false` must not retry writes automatically.
	 */
	idempotent_writes: boolean;
}

/** Whether a mutation is being planned or performed. */
export type Mode = "validate" | "commit";

/** What a mutation would do, or did. */
export interface MutationResult<T> {
	mode: Mode;
	/** True only when `mode` is "commit" and the write landed. */
	applied: boolean;
	/** The object as it would exist, or does. */
	result: T;
	/**
	 * What a reviewer should look at before this is committed. Empty is a
	 * meaningful answer; absent is not.
	 */
	warnings: string[];
	source?: SourceRef;
}

/**
 * An engagement system, as this library sees it.
 *
 * Every method may be absent. A caller reads `capabilities` and routes
 * accordingly rather than catching exceptions to discover what is possible.
 */
export interface EngagementAdapter {
	readonly name: string;
	capabilities(): Capabilities;

	listEngagements?(): Promise<Engagement[]>;
	getEngagement?(id: string): Promise<Engagement>;
	getTrialBalance?(engagementId: string, asOf?: string): Promise<TrialBalance>;
	listWorkpapers?(engagementId: string): Promise<Workpaper[]>;
	listReviewNotes?(engagementId: string): Promise<ReviewNote[]>;

	/**
	 * @param idempotencyKey Caller-supplied, stable across retries of the same
	 * logical write. Required when `capabilities().idempotent_writes` is true.
	 */
	proposeAdjustment?(
		adjustment: Adjustment,
		mode: Mode,
		idempotencyKey?: string,
	): Promise<MutationResult<Adjustment>>;

	putWorkpaper?(
		workpaper: Workpaper,
		mode: Mode,
		idempotencyKey?: string,
	): Promise<MutationResult<Workpaper>>;

	putReviewNote?(
		note: ReviewNote,
		mode: Mode,
		idempotencyKey?: string,
	): Promise<MutationResult<ReviewNote>>;
}

/** Nothing is supported until an adapter says so. */
export const NO_CAPABILITIES: Capabilities = {
	read_engagements: false,
	read_trial_balance: false,
	read_workpapers: false,
	read_review_notes: false,
	write_adjustments: false,
	write_workpapers: false,
	write_review_notes: false,
	idempotent_writes: false,
};
