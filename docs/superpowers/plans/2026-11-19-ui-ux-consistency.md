# Trankilandia UI, UX and reliability implementation plan

**Goal:** Resolve the reviewed defects across the web and Windows app while preserving the black and yellow identity confirmed by the user.

**Architecture:** Keep React, Tailwind, Supabase and Electron. Refine existing screens and enforce explicit persisted success, authenticated permissions and recoverable errors at the shared service boundaries.

**Constraints:** Never run tests against production. Do not deploy or execute database migrations remotely. Preserve membership prices and factual business content. Keep changes reviewable on `codex/ui-ux-consistency`.

- [x] Access: replace fabricated sessions and plaintext passwords with server authentication, close PIN fallbacks, remove personal data from public bundles, and prepare corrective SQL.
- [x] Transactions: isolate unit tests, preserve failed carts, persist offline sales before success, synchronize idempotently and reconcile discounts in cash reports.
- [x] Interface: retain brand colors, clarify labels and feedback, normalize forms and focus states, make modal keyboard behavior accessible, and remove fictitious courtesy-pass confirmations.
- [x] Desktop: cancel pending microphone starts, stop capture on release/unmount, resolve packaged audio paths, and prevent scanner shortcuts from hijacking forms.
- [x] Panels: improve responsive layout, task hierarchy, navigation and error visibility in administration, reception and member portal.
- [x] Validation: regression tests for consequential behavior; full isolated unit suite and build; rendered desktop/mobile review; independent code review; document pending database migration and hardware verification.

**Review focus:** invalid credentials; interrupted/offline requests; duplicate synchronization; discounted sales; keyboard/touch cancellation; narrow viewports; empty data and long names.
