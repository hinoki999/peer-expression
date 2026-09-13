import type { ApiClient, DropRequest, DropResponse, VoteSubmission,
  VoteAccepted, PublishedStatistic, UsageMilestone } from '@pe/shared';
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
      // Scope is server-derived; the mock keys on date alone, the same as
      // a real backend would once the assertion supplies the band.
      const drop = seed.drops[req.dropDate];
      if (!drop) throw new Error(`mock: no drop seeded for ${req.dropDate}`);
      return drop;
    },

    async submitVote(vote: VoteSubmission): Promise<VoteAccepted> {
      accepted.push(vote);
      return { accepted: true };
    },

    async getStatistics(cardIds) {
      return seed.statistics.filter((s) => cardIds.includes(s.cardId));
    },

    async getUsageMilestones(): Promise<readonly UsageMilestone[]> {
      // A catalog slice, never one format by id — an authenticated request
      // for a specific format is itself evidence of ownership.
      return Object.entries(seed.usage).map(([formatId, count]) => {
        let milestone = 0;
        for (const m of USAGE_MILESTONES) if (count >= m) milestone = m;
        return { formatId, milestone };
      });
    },
  };
}
