# Robinhood Read-Only Prompt

Use this prompt when checking Robinhood safely.

---

Use `$trading-research`.

This is a Robinhood read-only request.

Do not place trades.

Do not cancel orders.

Do not use `place_equity_order`.

Do not use `cancel_equity_order`.

Allowed tools only:

- get_accounts
- get_portfolio
- get_equity_positions
- get_equity_quotes
- get_equity_historicals
- get_equity_tradability
- get_equity_orders
- get_watchlists
- get_watchlist_items
- search

Task:

1. Use the Trader Bot only for read-only Robinhood data.
2. Show account summary.
3. Show portfolio summary.
4. Show current equity positions.
5. Show buying power if available.
6. Show open orders if available.
7. Do not recommend a trade unless Market Research and Risk Manager are also used.
8. Do not place trades.
