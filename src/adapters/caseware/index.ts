/**
 * Caseware Working Papers, reached through a bridge.
 *
 * ## Why a bridge and not a client
 *
 * Working Papers is a desktop application. Firms run it on Windows, often
 * published through Citrix, against files on a network share. There is no
 * endpoint this process can call from a laptop in another city, so the adapter
 * speaks to a small bridge that runs *inside* the firm's environment, beside the
 * files, holding whatever licensed components Caseware requires.
 *
 * That split is deliberate and it is also a licensing boundary. The protocol and
 * this adapter are ours and are open. Anything that links Caseware's own SDK
 * belongs to the bridge, which is distributed separately and under whatever
 * terms Caseware's agreements require.
 *
 * ## Before this is used across firms
 *
 * Caseware's API Usage Policy permits a customer to engage a third-party
 * developer where "the work is performed solely on the customer's behalf and for
 * the customer's internal business purposes", and states that API credentials
 * "must not be used to provide services to other organizations or to support any
 * multi-tenant deployment, unless Caseware expressly authorizes otherwise in
 * writing." Offering an integration to multiple firms requires "completion of a
 * formal partner review and written approval prior to any commercialization or
 * broad promotion."
 *
 * One firm, its own credentials, its own environment: fine. Anything wider is a
 * conversation with Caseware first. See `docs/security.md`.
 *
 * ## Status
 *
 * The transport is not implemented. Capabilities are all false, which is the
 * honest answer and which callers are required to respect. This file exists to
 * fix the shape of the integration, not to pretend it works.
 */

import type { Capabilities, EngagementAdapter } from "../types.js";
import { NO_CAPABILITIES } from "../types.js";

export interface CasewareBridgeConfig {
	/** Where the in-firm bridge is listening. */
	endpoint: string;
	/** Seconds. Working Papers on a network share is not always quick. */
	timeout_seconds?: number;
}

export class CasewareBridgeAdapter implements EngagementAdapter {
	readonly name = "caseware-bridge";

	constructor(private readonly config: CasewareBridgeConfig) {}

	/**
	 * All false until a bridge is actually reachable and its own capabilities
	 * have been read from it. An adapter that claims what it cannot do turns a
	 * clean refusal into a half-finished write.
	 */
	capabilities(): Capabilities {
		return { ...NO_CAPABILITIES };
	}

	/** The configured endpoint, for diagnostics. Never the credentials. */
	describe(): string {
		return `${this.name} → ${this.config.endpoint} (not implemented)`;
	}
}
