# Order Review Prompt

Use this prompt only when reviewing a possible order.

---

Use `$trading-research`.

This is an order review only.

Do not place the order.

Do not use `place_equity_order`.

Task:

1. Confirm the proposed ticker, direction, asset type, and dollar amount.
2. Confirm that the Market Research Agent created the thesis.
3. Confirm that the Risk Manager approved the idea.
4. Confirm that the trade obeys `policies/risk_rules.yaml`.
5. Use Robinhood `review_equity_order` only.
6. Present the review result to the user.
7. Explain risks.
8. Stop after the review.
9. Do not place the order.

A real order may only be placed later if the user writes exactly:

"I approve"
