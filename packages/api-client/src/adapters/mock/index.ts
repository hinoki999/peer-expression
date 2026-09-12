import type { ApiClient, DropRequest, DropResponse, VoteSubmission,
  VoteAccepted, PublishedStatistic, PublicationScope, UsageMilestone } from '@pe/shared';
import { USAGE_MILESTONES } from '@pe/shared';

/**
 * In-memory adapter. Runs the whole app before a database exists, so the
 * step-11 prototype test can happen while the binding is still open.
 *
 * Deliberately mirrors the real constraints:
 *  - accepts a vote and returns nothing about it (I12)
 *  - serves only normalized statistics (I13)
 *  - has no operation taking a recipient (I17)
 */
export function createMockAdapter(seed: {
  drops: Record<string, DropResponse>;
  statistics: readonly PublishedStatistic[];
  usage: Record<string, number>;
}): ApiClient {
  const accepted: VoteSubmission[] = [];

  return {
    async getDrop(req: DropRequest): Promise<DropResponse> {
      const key = `${req.scope}:${req.dropDate}`;
      const drop = seed.drops[key];
      if (!drop) throw new Error(`mock: no drop seeded for ${key}`);
      return drop;
    },

    async submitVote(vote: VoteSubmission): Promise<VoteAccepted> {
      accepted.push(vote);
      return { accepted: true };
    },

    async getStatistics(cardIds, scope) {
      return seed.statistics.filter(
        (s) => cardIds.includes(s.cardId) && s.scopeShown === scope,
      );
    },

    async getUsageMilestone(formatId: string): Promise<UsageMilestone> {
      const count = seed.usage[formatId] ?? 0;
      let milestone = 0;
      for (const m of USAGE_MILESTONES) if (count >= m) milestone = m;
      return { formatId, milestone };
    },
  };
}
