# ESLint baseline

ESLint tooling was restored on October 24, 2026. A clean checkout of the
pre-maintenance `HEAD` reports 75 existing lint errors and zero warnings. The
maintenance changes introduce no additional lint errors. The active working
tree also contains eight errors from unrelated dirty or untracked work, for a
current total of 83 errors.

Repository-wide lint is therefore functional but not yet passing. Existing
findings remain visible and no correctness rules are globally suppressed.

Recommended cleanup: resolve the baseline incrementally by rule and subsystem,
starting with unused imports/variables and empty blocks, followed by replacing
explicit `any` types and addressing ESLint 10 correctness findings. Keep each
cleanup batch behavior-preserving and covered by its relevant regression tests.
