# integrity-authority

Knows the account. Derives `weight_tier` from *live* integrity evidence and
issues one TrustAssertion per vote, each bound to a distinct ephemeral key.

**Must not durably retain the key fingerprints it issued against** (I29).
An `account -> {K1..K12}` record joined to `K -> vote` at the gateway is
full linkage.
