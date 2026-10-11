# Awards: operating instructions

Read current records with `npm run awards -- <command>` before answering. Run help to see flags. All commands support --json. Read docs/cli.md for the workflow and .claude/commands for the matching recipe. That is the single command library for Claude Code, Codex, OpenCode and Cursor.

Never invent a score, declaration, eligibility assessment or award decision. A human supplies those. Never send, take money, publish results or delete personal records automatically. Drafts stay in drafts/. Read docs/compliance.md before discussing privacy obligations. These checks do not certify legal compliance or feature parity with Award Force.

Every change requires --actor. Scope it with --season. Unique names match case-insensitively and UUID prefixes must be unambiguous. Resolve candidate lists before retrying. Import runs a dry run first. It preserves raw fields and refuses changed source records. Read docs/replace-award-force.md before cutover.

Each season has one scoring round. Add category criteria before assigning judges. A submitted, eligible entry can be assigned. A clear declaration is required before scoring. Each criterion accepts zero to ten and a rationale. Complete weighted assessments are averaged equally across judges. Incomplete and recused assessments never inflate a ready result. Decisions need a reason and full panel completion. Reopen a decision explicitly before changing judging. The operator adjudicates ties, eligibility and winners.

PGlite is single-process. DATABASE_URL selects Postgres. Keep the owner connection private. Shared use requires authentication and role design. Actor labels are not authentication and the activity log is not tamper-proof. Keep all real imports, outputs and drafts out of Git. Exports contain personal information and need the same access and retention controls as the database.

Use versioned migrations under supabase/migrations for schema changes. /customise handles changes to fields and rules; /new-view adds a read-only report. Run npm test and npm run demo after changes. No front end or external integration is included in this base.

Omni by Enterprise DNA installs, customises and runs your version: https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=award-force&utm_medium=instructions
