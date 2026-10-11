# Awards for Claude Code

Keep entry checks, judge declarations, scores and award decisions in a database you own.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free under the MIT licence. Try the fictional awards and weekly review. | Your categories, judging rules, entry fields and Award Force migration. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=award-force&utm_medium=customise) | [Book a call](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=award-force&utm_medium=managed) |

For associations and awards organisers who need a reliable internal judging record. Award Force Pro lists NZ$10,300 annually on its [pricing page](https://awardforce.com/pricing/), checked 11 October 2026. This is the published plan price, not a verified customer invoice. Award Force includes hosted entry and judging experiences, exports and broader programme features. This base covers staff-managed entries and one weighted judging round per season. [Scope and sources](docs/research.md).

## Quick start

Node 20 or later, Windows or Linux:

```bash
git clone https://github.com/Enterprise-DNA-OS/awards-for-claude-code.git
cd awards-for-claude-code
npm install
npm run demo
npm test
npm run view
npm run docs
```

Open the folder with Claude Code, Codex, OpenCode or Cursor and ask for `/weekly-review`. AGENTS.md and CLAUDE.md share the same instructions and command recipes.

The embedded PGlite database persists in .data/db and supports one process at a time. DATABASE_URL selects Postgres 15 or later. Before real imports, use a fresh DATA_DIR or database and run `npm run migrate` without the demo seed. The demo is fictional: an eligible and fully scored food hub, an overdue library entry missing a judge, and a repair circle awaiting eligibility review. Dates are relative to the first seed. Repeating the seed preserves work.

## Five weekly jobs

1. `/entry-check`: review submissions and eligibility evidence.
2. `/panel-check`: find entries short of independent judges.
3. `/judge-chase`: collect outstanding declarations and scores.
4. `/results`: compare complete assessments and score spread.
5. `/weekly-review`: combine outstanding work, results and privacy reviews.

There are 35 CLI commands and 37 slash recipes. `npm run awards -- help` lists each command and its flags. Every CLI command accepts --json. Names match without case and UUID prefixes must be unique. An ambiguous match lists candidates and exits 1. [Command reference](docs/cli.md).

Weighted score = sum(score × weight) / sum(weight), on a zero-to-ten scale. A judge's total is withheld until every criterion is scored and their declaration is clear. An entry is ready only when eligible, submitted, its minimum panel size is met and every non-recused assignment is complete. The displayed mean uses complete assessments only and is provisional until ready. Judges declaring a conflict are excluded. Criteria lock after the first assignment. Decisions require a reason and freeze judging changes until explicitly reopened. Ties and winners remain human decisions. Season locks serialize changes through the CLI on shared Postgres.

## Ten questions for the awards meeting

These are supported questions, not a claim that Award Force cannot report on the same records. Award Force documents judging reports, custom exports and programme dashboards. The difference is that you can change this system's records and rules yourself.

| Question | Command |
|---|---|
| Which entries still need an eligibility decision? | entry-check |
| Which eligible entries have too few judges? | panel-check |
| Which judges owe a declaration or score? | judge-chase |
| Where has a judge declared a conflict? | conflict-register |
| Which entries are ready for the panel's decision? | results |
| Where do completed judges disagree most? | results |
| What evidence supports each criterion score? | score-ledger |
| Which winners or shortlists have a recorded reason? | decisions |
| Which records need a notice or retention review? | compliance |
| What must the organiser resolve this week? | weekly-review |

## Your first hour: ten things to ask for

1. Put our business name and colours on the paperwork.
2. Show entries with missing eligibility evidence.
3. List overdue judge work.
4. Check the food hub's weighted score against its criteria.
5. Find entries with a short panel.
6. Draft the chair's internal briefing.
7. Test our Award Force entry export without saving changes.
8. Add our regional chapter field through `/customise`.
9. Add a programme snapshot through `/new-view`.
10. Record an evidence-backed award decision after the panel meets.

## Bring your history

```bash
npm run awards -- import award-force --season=HARBOUR --file=imports/entries.csv --actor="Migration operator" --dry-run
npm run awards -- import award-force --season=HARBOUR --file=imports/entries.csv --actor="Migration operator"
```

One command imports one season's entry CSV after destination categories are set up. Column aliases and an optional mapping support configurable export headings. Every raw source field is preserved. Identical repeats skip, changed rows stop for reconciliation, and any bad row rolls back the file. The fixture is synthetic. Judging history, files, fee records and external accounts need separate reconciliation. [Exact mappings and cutover checks](docs/replace-award-force.md).

## Paperwork and views

`npm run docs` renders a panel brief, decision record and judging ledger for each season. `npm run view` renders weekly and privacy reports. Change brand.json once for your business name, logo and colours. Outputs are read-only HTML you can print to PDF. Keep them private.

`/compliance` checks for missing notice assessments, retention review dates and overdue security reviews. The ninety-day security reminder is a configurable local policy, not a statutory deadline. Checks support evidence review, not legal certification. [Rules and sources](docs/compliance.md).

`/customise` changes fields or rules through a versioned migration. `/new-view` adds a read-only report. [What a front end provides](docs/why-no-front-end.md).

## Verification and operation

`npm test` uses a temporary database, exercises all 35 commands and checks weighted scoring, incomplete judging, conflicts, locked decisions, cross-season references, import rollback and repeats, CSV edge cases, privacy dates, exports, drafts, HTML escaping and CLI exit codes. CI covers Node 20 and 22 on Windows and Linux, plus Postgres 17. TEST_DATABASE_URL must point to a fresh disposable database.

The CLI uses a trusted operator database connection. Actor labels record who the operator says made a change; they are not authentication. This base is not a public judging portal. Shared deployment needs restricted roles, authenticated access, backups and a recovery rehearsal. RLS is enabled with no public access policies. The database owner can still change records directly. Activity history is not tamper-proof.

Export includes all eight record sets as JSON. It is an interchange snapshot, not an automatic restore. Back up the database and evidence files separately. No command sends messages, takes money or publishes results.

MIT licence. Not affiliated with Award Force or Anthropic. Hosting and agent subscriptions have separate costs. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=award-force&utm_medium=readme).
