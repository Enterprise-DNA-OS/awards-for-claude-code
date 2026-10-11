# Command reference

Use npm run awards -- COMMAND. All commands support --json. Flags use --name=value. Names are case-insensitive exact matches; UUID prefixes must be unique. All changes require --actor. Season-scoped changes require --season. Optional fields: organisation, out and mapping. Dry-run is an optional boolean on import. All other listed flags are required.

| Command | Flags |
|---|---|
| help | none |
| seasons | none |
| categories | none |
| criteria | none |
| entries | none |
| judges | none |
| entry-check | none |
| panel-check | none |
| judge-chase | none |
| conflict-register | none |
| results | none |
| score-ledger | none |
| attention | none |
| compliance | none |
| decisions | none |
| activity | none |
| weekly-review | none |
| draft-panel-brief | --season |
| export | --out |
| add-season | --code --name --closes --due --owner --actor |
| add-category | --season --name --required --actor |
| add-criterion | --season --category --name --weight --actor |
| add-entry | --season --category --name --entrant --organisation --actor |
| add-judge | --season --name --organisation --actor |
| eligibility | --season --entry --state --evidence --actor |
| assign | --season --entry --judge --due --actor |
| declare | --season --entry --judge --state --evidence --actor |
| score | --season --entry --judge --criterion --value --reason --actor |
| decide | --season --entry --state --reason --actor |
| reopen-decision | --season --entry --reason --actor |
| withdraw | --season --entry --reason --actor |
| privacy-review | --season --entry --notice --retention --actor |
| security-review | --season --date --evidence --actor |
| log | --season --note --actor |
| import | --season --file --mapping --dry-run --actor |

Create a season, categories and criteria before entries and judges. Assess eligibility, assign judges, record declarations, then scores. Weights are positive and normalised within each category. Scores range from zero to ten. Complete assessments have equal weight across judges. Required panel size is a whole number from one to twenty. Criteria lock after an assignment. Human decisions require completed panels and a reason. Reopen a decision before changing its underlying judging.

Read commands cover all seasons. Use the returned season IDs or add a scoped view when a reporting boundary is needed. Results always show readiness beside the mean. The mean is provisional until ready. Withdrawn, incomplete and ineligible entries cannot become ready.

Import syntax is import award-force, followed by the flags. It imports entry records, preserves raw source columns and never imports scores or attachments. Export returns all eight record sets as JSON or writes --out. Generated drafts are internal only. Nothing sends or publishes.
