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
