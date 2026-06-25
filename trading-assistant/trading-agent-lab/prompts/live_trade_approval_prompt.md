# Live Trade Approval Prompt

Use this prompt only when the user wants to place a real trade.

---

Use `$trading-research`.

Before doing anything, check if the user wrote exactly:

"I approve"

If the exact phrase is missing, stop and say:

"Real trade execution is blocked because the required approval phrase was not provided."

If the exact phrase is present:

1. Read `policies/risk_rules.yaml`.
2. Confirm live testing is enabled.
3. Confirm the Risk Manager approved the trade.
4. Confirm `review_equity_order` was already used.
5. Confirm the order size is within policy.
6. Confirm the asset is allowed.
7. Confirm no options, no margin, no short selling.
8. Use `place_equity_order` only if all checks pass.
9. Record the action in `journal/trade_journal.md`.

If any check fails, do not place the trade.
