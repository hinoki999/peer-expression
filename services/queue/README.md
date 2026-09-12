# queue

Randomized publication delay. Holds pending votes, shuffles on drain, folds
into counters, destroys.

**In-memory or short-lived only — never durable** (I3). It transiently holds
the row structure that was removed from the schema to defeat session
fingerprinting; persisting it would reintroduce exactly that.
