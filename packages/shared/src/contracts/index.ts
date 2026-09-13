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
  dropDate: string;
  /**
   * No scope. The band is derived server-side from the signed assertion,
   * exactly as on the vote path (I30). A client that names its own scope
   * can read another band's content, which is I7 — and cohort separation
   * is a safety mechanism, not a data-quality one.
   */
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
  /** Scope derives server-side. Card ids only. */
  getStatistics(cardIds: readonly string[]): Promise<readonly PublishedStatistic[]>;
  /**
   * Milestones for a whole catalog slice, never one format by id.
   * An authenticated request for a specific format is itself evidence of
   * ownership — the linkage would be moved, not removed (doc 18 O3).
   */
  getUsageMilestones(): Promise<readonly UsageMilestone[]>;
}
