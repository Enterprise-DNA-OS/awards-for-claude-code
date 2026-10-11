# Bring Award Force entries across

Award Force documents CSV exports of entries, users, scores, judging progress and results. Its exports can be customised, so headings are not a universal fixed contract. Source: [Report and export](https://awardforce.com/features/program-management-features/report-and-export/) and [Column and export management](https://awardforce.com/blog/feature-focus/column-export-management/), checked 11 October 2026.

1. In Award Force, choose the season and filter the Entries view to the records you want. Export a CSV with a stable entry identifier, entry name, category, entrant name and entry status. Keep the original unedited export separately. Download attachments and other reports separately.
2. Start a fresh database, run npm run migrate and create the destination season and categories. Match the source season name or code and category names. Set up your scoring criteria before assignments.
3. Run the command below with --dry-run. If your headings differ, supply a JSON mapping. Check the row count and source season. The included fixture is synthetic, not a file taken from a vendor account.
4. Run again without --dry-run. Reconcile total entries, statuses and categories against Award Force. Review imported personal information notices and retention purpose before use.
5. Reconcile scores, judge identities, declarations, files and decisions separately. Keep both systems until the owner signs off the record counts, judging rules, required participant experience and recovery plan.

```bash
npm run awards -- import award-force --season=YOUR_SEASON --file=imports/entries.csv --actor="Migration operator" --dry-run
npm run awards -- import award-force --season=YOUR_SEASON --file=imports/entries.csv --actor="Migration operator"
```

| Destination | Accepted headings |
|---|---|
| Source identifier, required | Entry ID, Entry slug, Slug, ID |
| Entry title, required | Entry name, Entry title, Title |
| Category, required | Category, Category name |
| Entrant, required | Entrant, Entrant name, Name |
| Organisation, optional | Organisation, Organization |
| Source status, required | Status, Entry status |
| Source season, optional | Season, Season name |

Statuses are accepted case-insensitively as Submitted, In progress and Withdrawn. Unrecognised statuses stop the import rather than guess. If the export includes Season, it must match the destination name or code. An export without that field must contain one verified season only. The importer does not infer eligibility, consent or past judging from a submission status.

Map logical keys to exact headings when needed:

```json
{"id":"Reference","name":"Project title","entrant":"Applicant name"}
```

Save that mapping in imports/mapping.json and add `--mapping=imports/mapping.json`. Allowed keys are id, name, category, entrant, organisation, status and season. CSV supports quoted commas, quotes, newlines, BOM and CRLF. Invalid or duplicate headings and duplicate identifiers stop the whole file. Repeated identical source rows skip. Changed source rows stop for a reviewed reconciliation. Imports never overwrite subsequent local decisions.

All source columns remain in source_data. Only the fields above become working records. URLs in the source do not download files. Judges, score sets, scores, comments, rounds, payments, authentication, forms and attachments are not imported by this command. Plan their mapping as separate work with Enterprise DNA. There is no promise of complete Award Force migration from a single entries report.
