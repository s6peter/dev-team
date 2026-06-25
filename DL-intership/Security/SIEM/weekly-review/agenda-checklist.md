# Weekly SIEM Review — Agenda & Checklist

> **Task:** #718 — Establish weekly SIEM review cadence and metrics
> **Cadence:** Every week (suggested: Monday or Friday)
> **Duration:** ~60 minutes
> **Owner:** Security / SOC Team

---

## Meeting Info

| Field        | Details                  |
|--------------|--------------------------|
| Date         | `YYYY-MM-DD`             |
| Facilitator  |                          |
| Attendees    |                          |
| Next Meeting |                          |

---

## 1.SIEM Health Check (~10 min)

> Verify the SIEM platform is operating correctly before reviewing any data.

- [ ] All log sources are ingesting correctly (no gaps or failures)
- [ ] Agents/connectors are healthy and reporting
- [ ] Storage/capacity is within acceptable thresholds
- [ ] Correlation rules and detection policies are active
- [ ] Scheduled reports ran successfully this week
- [ ] Any platform updates or changes to note?

**Notes:**
```
(add notes here)
```

---

## 2.Alerts Review (~20 min)

> Review all alerts triggered this week and determine their status.

- [ ] Pull alert summary report for the past 7 days
- [ ] Review all **Critical** and **High** severity alerts
- [ ] Triage each alert:
  - [ ] Confirmed threat → escalate / incident created
  - [ ] False positive → document and tune rule
  - [ ] Under investigation → assign owner + due date
- [ ] Identify any recurring or trending alert patterns
- [ ] Review any escalated incidents from last week

**Alert Summary:**

| Alert Name | Severity | Count | Status | Owner |
|------------|----------|-------|--------|-------|
|            |          |       |        |       |
|            |          |       |        |       |

**Notes:**
```
(add notes here)
```

---

## 3.Backlog Grooming (~15 min)

> Review open items from previous weeks and keep the backlog clean.

- [ ] Review all open items from last week's meeting
- [ ] Close items that are resolved
- [ ] Re-prioritize items based on current risk
- [ ] Identify any items that are blocked — who can unblock?
- [ ] Archive items older than 30 days with a resolution note

**Backlog Items:**

| Item | Date Opened | Priority | Status | Owner |
|------|-------------|----------|--------|-------|
|      |             |          |        |       |
|      |             |          |        |       |

**Notes:**
```
(add notes here)
```

---

## 4.Action Items (~10 min)

> Capture all decisions and tasks coming out of this meeting.

- [ ] Recap decisions made during this session
- [ ] Assign an owner and due date to every action item
- [ ] Confirm next meeting date and facilitator

**Action Items:**

| # | Action Item | Owner | Due Date | Status |
|---|-------------|-------|----------|--------|
| 1 |             |       |          | Open   |
| 2 |             |       |          | Open   |
| 3 |             |       |          | Open   |

---

## 5.Weekly Metrics Snapshot (optional)

> Quick snapshot of key SIEM metrics for trending over time.

| Metric                         | This Week | Last Week | Trend |
|-------------------------------|-----------|-----------|-------|
| Total alerts                  |           |           |       |
| Critical alerts                |           |           |       |
| False positives                |           |           |       |
| Mean time to triage (MTTT)    |           |           |       |
| Open incidents                 |           |           |       |
| Rules tuned                    |           |           |       |

---

##  Archive

> After each meeting, save a copy of this file to the `archive/` folder:
> `SIEM/weekly-review/archive/YYYY-MM-DD.md`

---

*Document maintained under: `SIEM/weekly-review/agenda-checklist.md`*
*Parent task: #718 — Establish weekly SIEM review cadence and metrics*
