import type { PublicationScope } from '../taxonomy/cohorts.ts';
import type { Card, CardOption, PublishedStatistic, TrustAssertion } from '../model/index.ts';

/**
 * The binding seam. Every backend Atlas might choose satisfies this
 * shape; nothing above it changes when the binding lands.
 *
 * Contract audit (CI) asserts this surface never gains:
 *   - an operation taking a recipient          (I17 — no channel)
 *   - an operation returning raw counts        (I13 — normalized only)
 *   - an operation exposing a vote timestamp   (I2)
 */

export interface DropRequest {
  scope: PublicationScope;
  dropDate: string;
}

export interface DropResponse {
  cards: readonly Card[];
  options: readonly CardOption[];
  /** Prefetched with the drop so the whole session works offline. */
  statistics: readonly PublishedStatistic[];
}

export interface VoteSubmission {
  cardId: string;
  choice: string;
  /** Band and tier arrive inside this, signed. Never sent as loose fields. */
  assertion: TrustAssertion;
}

export interface VoteAccepted {
  accepted: true;
  /** Deliberately carries no updated statistic — the reveal shows the
   *  last published snapshot, and no surface distinguishes pending from
   *  counted (I12). */
}

export interface UsageMilestone {
  formatId: string;
  milestone: number;   // "25+", never 24, never progress toward the next (I24)
}

export interface ApiClient {
  getDrop(req: DropRequest): Promise<DropResponse>;
  submitVote(vote: VoteSubmission): Promise<VoteAccepted>;
  getStatistics(cardIds: readonly string[], scope: PublicationScope): Promise<readonly PublishedStatistic[]>;
  getUsageMilestone(formatId: string): Promise<UsageMilestone>;
}
