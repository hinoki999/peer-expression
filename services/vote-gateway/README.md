# vote-gateway

Verifies the TrustAssertion and its proof of possession, then forwards
`(card, cohort, choice, weight_tier)` to the queue. **Never sees an account.**

Cohort arrives signed, never client-asserted (I30).
