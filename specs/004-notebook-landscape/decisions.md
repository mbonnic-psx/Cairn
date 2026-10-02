# Decisions — The notebook in the landscape

Every product decision a `/cruise` run took, in order. A person overrides one by editing its `Status` and writing the answer into the artifact.

## D1 — Does `/cruise` run the `reveal` slice?
- **Stage:** split · **Slice:** reveal · **When:** 2026-10-01T22:45:00Z · **Iteration:** 0
- **Question:** The split ends with `reveal`, which makes the notebook the default. May an unattended run take it?
- **Options:** run it after the four page slices; stop before it and park (recommended)
- **Decision:** Stop before it. A run that reaches `reveal` parks for the owner.
- **Why:** The owner wants to see and accept all three looks themselves before the notebook replaces today's interface (SC-008). An agent's demo is not that acceptance.
- **Decided by:** human
- **Confidence:** high · **Would reverse if:** the owner accepts all three looks in a demo and asks for the reveal
- **Written to:** `.specify/product-owner.md` (Out of scope), `specs/004-notebook-landscape/story-split.md` (row 7 needs the owner's demo)
- **Status:** standing

## D2 — Does a released build open at 1280×800 before the reveal?
- **Stage:** after acceptance (adversary triage) · **Slice:** frame · **When:** 2026-10-01T23:58:00Z · **Iteration:** 1
- **Question:** Adversary finding R2: a released build opens at 1280×800, not today's 1000×720, before the reveal. That differs from the letter of SC-009 and FR-012. Keep it or revert it?
- **Options:** keep 1280×800 (the host's triage); open at 1000×720 until the reveal
- **Decision:** Keep 1280×800 in released builds. R2 stays declined.
- **Why:** The owner asked for 1280×800 (FR-028), and the window's size is not the interface the reveal guards.
- **Decided by:** human
- **Confidence:** high · **Would reverse if:** the owner asks for released builds to keep today's window until the reveal
- **Written to:** `specs/004-notebook-landscape/adversary-log.md` (R2)
- **Status:** standing
