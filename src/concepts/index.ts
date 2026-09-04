/**
 * Portable working-paper concepts.
 *
 * These are the accounting ideas an engagement is made of, not any one vendor's
 * representation of them. A trial balance is a trial balance whether it lives in
 * Caseware Working Papers, a Cloud engagement, or a spreadsheet a firm has used
 * for fifteen years. Adapters translate; this file does not know they exist.
 *
 * The rule that keeps the boundary honest: nothing here may name a vendor, a
 * file format, a column position, or a field ID. The moment a concept cannot be
 * expressed without one, it belongs in the adapter.
 */

/** Where a value came from, so a reviewer can get back to it. */
export interface SourceRef {
	/** The adapter that produced this value. */
	adapter: string;
	/** Vendor-native identifier, opaque to everything above the adapter. */
	native_id?: string;
	/** Supporting document, when the value was read off one. */
	document_id?: string;
	/** Page within that document, 1-indexed as a person would count. */
	page?: number;
	/** Content hash of what was read, so a later change is detectable. */
	checksum?: string;
	/** When the adapter read it. ISO 8601. */
	read_at?: string;
}

/** An engagement: one period of work on one entity. */
export interface Engagement {
	id: string;
	adapter: string;
	entity_name: string;
	/** ISO 8601 date. */
	period_start: string;
	/** ISO 8601 date. */
	period_end: string;
	/**
	 * What the firm is producing. Not every engagement issues statements, and
	 * the level determines what evidence is required, so it is a first-class
	 * property rather than something inferred from the file's contents.
	 */
	kind?: "compilation" | "review" | "audit" | "bookkeeping" | "other";
	/** Prior period, when the firm has one. The single most useful input. */
	prior_engagement_id?: string;
	source?: SourceRef;
}

/** One line of the chart of accounts, as this engagement sees it. */
export interface Account {
	/** The firm's own account number. Firms do not share a numbering scheme. */
	code: string;
	name: string;
	/**
	 * The firm's grouping for financial statement presentation.
	 *
	 * Deliberately a free string. Grouping numbers differ between firms and
	 * between files at the same firm, and a fixed enum here would quietly
	 * mistranslate one firm's 240 into another's. Meaning lives in the firm's
	 * own methodology, not in this type.
	 */
	group?: string;
	balance?: Money;
	source?: SourceRef;
}

/**
 * An amount, in minor units, with its currency.
 *
 * Integer minor units rather than a float: a trial balance has to tie exactly,
 * and 0.1 + 0.2 does not. Rounding is the caller's decision, made once, at the
 * point of presentation.
 */
export interface Money {
	/** Minor units. $84,291.00 CAD is 8429100. */
	amount: number;
	/** ISO 4217. */
	currency: string;
}

/** A trial balance at a point in time. */
export interface TrialBalance {
	engagement_id: string;
	/** ISO 8601 date the balances are struck at. */
	as_of: string;
	accounts: Account[];
	source?: SourceRef;
}

/** A proposed or posted adjusting entry. */
export interface Adjustment {
	id?: string;
	engagement_id: string;
	description: string;
	lines: AdjustmentLine[];
	/**
	 * Why this entry exists, in the words a reviewer needs. An adjustment
	 * without a reason is one a partner has to reverse-engineer at review.
	 */
	rationale?: string;
	source?: SourceRef;
}

export interface AdjustmentLine {
	account_code: string;
	/** Positive debits, negative credits. The pair must sum to zero. */
	amount: Money;
}

/** A working paper: the document and the evidence behind a balance. */
export interface Workpaper {
	id?: string;
	engagement_id: string;
	/** The account or grouping this paper supports. */
	reference: string;
	title: string;
	document_ids?: string[];
	source?: SourceRef;
}

/** A question raised on the file, and its answer. */
export interface ReviewNote {
	id?: string;
	engagement_id: string;
	reference?: string;
	body: string;
	status: "open" | "answered" | "cleared";
	/** Who raised it. A note with no author cannot be followed up. */
	raised_by?: string;
	answered_by?: string;
	source?: SourceRef;
}
