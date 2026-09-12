# Spike 04 — Age band under TestFlight (Q1)

**Branch:** `spike/age-band-testflight` · **~half a day** · possibly blocking

## Why
This one can invalidate the launch gate, which is why it is cheap and early.

The pre-launch population fill has to produce **band-resolved**
contributions. Bands come from the platform Declared Age Range API. Since
the band is carried in a signed assertion, an account with no resolved band
cannot contribute at all — so if the API returns nothing under TestFlight:

> fill cannot be band-resolved → the opening set cannot become publishable →
> the launch gate can never be satisfied before public launch → **circular**.

Age declaration *should* be a property of the platform account and its
parental-consent chain rather than of the distribution channel. "Should" is
not good enough for something that gates launch.

## Do
On both platforms: a TestFlight / internal-distribution build, a minor
account with parental consent, confirm a band is returned and that it
matches the account's real band.

## Answers
- Does Declared Age Range resolve under TestFlight on iOS?
- Under internal distribution on Android?
- Same band as production would return?

## Done when
Yes or no, in writing, here. If no, the launch gate needs rethinking before
anyone commits to recruiting 500 minors under parental consent.
