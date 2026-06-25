# Daily Market Research Prompt

Use this prompt when asking the system to research the market.

---

Use `$trading-research`.

Operating mode is research only.

Do not place trades.

Do not cancel orders.

Do not use `place_equity_order`.

Do not use `cancel_equity_order`.

Task:

1. Use the Market Research Agent to find potential market opportunities.
2. Use the Public Policy / Political Catalyst Tracker only for public policy, regulation, government contract, or political catalysts.
3. Focus on liquid large-cap stocks and ETFs.
4. Avoid options, margin, crypto, short selling, penny stocks, and rumors.
5. Produce up to 5 trade ideas.
6. For each idea, include:
   - ticker or sector
   - direction
   - catalyst
   - thesis
   - evidence
   - bull case
   - bear case
   - invalidation condition
   - risk level
   - reason not to trade
   - suggested next step
7. Send only the strongest idea to the Risk Manager.
8. Do not use Robinhood execution tools.
9. Add a summary to `journal/trade_journal.md`.
