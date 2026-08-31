# Samsarix Page Lens bounded pilot

This protocol tests whether Page Lens changes real source-triage decisions without adding telemetry, accounts, page uploads, or manufactured adoption claims. Preparing this protocol is not pilot evidence. The pilot is complete only when real participants finish the tasks and the anonymized aggregate below is filled from their responses.

## Product hypothesis

For people who routinely decide which webpages deserve deeper reading, a transparent on-device brief plus a private decision queue will reduce avoidable reading and make saved-source decisions easier to revisit. The wedge succeeds only if participants understand that its signals describe page structure and visible provenance—not truth or credibility.

## Participants

Recruit 8–12 consenting adults who make genuine source decisions, with at least two participants from each available cohort:

- researchers or analysts;
- writers or journalists;
- students or educators;
- independent knowledge workers who compare online sources.

Do not recruit only contributors, friends already familiar with the interface, or people paid according to positive feedback. Record cohort, browser/OS, and prior familiarity—not names, employers, email addresses, or the pages they visit—in the aggregate result.

## Safety and privacy

- Use the unsigned [v1.8.2-pilot.1 prerelease](https://github.com/Deathcharge/samsarix-page-lens/releases/tag/v1.8.2-pilot.1) artifact `samsarix-page-lens-1.8.2.zip` with SHA-256 `8D2F75C93F16B929B0F27AFCEFFA2550FDF7B655B33FF6F9DA1BA2A31522101E`. Do not silently substitute another build.
- Explain that the build is an unsigned pilot extension and provide removal instructions.
- Participants choose their own ordinary public pages. Do not ask them to disclose URLs, browsing history, source text, queue exports, screenshots, or private notes.
- Do not use pages containing medical, financial, legal, authentication, private workplace, or personally sensitive material for the pilot.
- Feedback is voluntary. The **Pilot feedback** link opens the participant's email client with a privacy warning and structured questions; Page Lens neither sends nor observes the message.
- Aggregate answers without attributable quotations. Delete raw email after aggregation unless the sender explicitly asks for follow-up.

## Session

Give only the short product description from the store listing. Do not demonstrate the controls before Task 1.

1. **First brief:** choose a real public page you might read, create a brief, and explain what you think each score means.
2. **Decision:** decide whether to read deeper, keep as a reference, skip, or leave unreviewed; add a non-sensitive note and save it.
3. **Second source:** analyze another page relevant to the same real task and compare it with the saved baseline.
4. **Recovery:** create a queue backup and queue Markdown, select **Remove** beside one test record and confirm, then restore the JSON backup after reading the import confirmation. Check that the other record was unchanged and the restored decision/note match the backup.
5. **Return:** after 2–7 days, reopen Page Lens without assistance and use the queue for one genuine source decision.
6. **Feedback:** use the in-product link or answer the same six questions verbally. Ask the participant to distinguish “page signal” from “truth/credibility judgment.”

The facilitator records only completion, assistance, elapsed-time bands, comprehension, decision impact, return use, and a categorized problem statement. Never record analyzed URLs or note contents.

## Measures and thresholds

Use integer counts and publish the denominator; do not report percentages without counts. A bounded pilot passes only when all conditions hold:

- at least 8 participants complete Tasks 1–4 and at least 6 attempt the return task;
- at least 75% complete first analysis and save without facilitator help;
- at least 70% of return-task participants complete a genuine source decision without help;
- at least 75% correctly state that signals are not a fact check or credibility rating;
- at least 60% report that the brief or comparison changed, clarified, or accelerated a real reading decision;
- at least 60% say they would use Page Lens again for an identified use case;
- no participant reasonably believes page content was uploaded, and no observed data-loss or privacy-critical defect remains open.

A threshold miss is evidence, not a wording problem. Classify the result as **pass**, **iterate**, or **stop/reposition**. Do not broaden distribution after an iterate result until the highest-severity causes are addressed and retested.

## Severity and decision rules

- **P0 privacy/data loss:** unexpected transmission, exposure, destructive import without consent, or unrecoverable queue loss. Stop immediately.
- **P1 task blocker:** a core task cannot be completed on a supported Chrome setup. Fix before continuing recruitment.
- **P2 comprehension/efficiency:** misleading signal interpretation, unclear control, or repeated need for help. Aggregate and prioritize by frequency.
- **P3 preference:** polish or feature request that does not block the validated wedge.

Feature requests enter the roadmap only when tied to the same narrow source-triage purpose and observed in at least two independent sessions. Remote AI, accounts, background browsing collection, or broad host access require a new product/privacy decision rather than being treated as routine pilot fixes.

## Aggregate result template

Copy this section into a dated `docs/pilots/YYYY-MM-DD-1.8.2.md` file after the pilot. Commit no raw responses.

```text
Artifact version and SHA-256:
Dates and facilitator:
Recruitment method:
Cohorts (counts only):
Browser/OS matrix (counts only):

Completed Tasks 1–4: __ / __
Attempted return task: __ / __
First analysis + save without help: __ / __
Return decision without help: __ / __
Understood signal limitation: __ / __
Reported decision impact: __ / __
Would use again for a named use case: __ / __
Believed content was uploaded: __ / __

P0 / P1 / P2 / P3 findings (anonymous categories and counts):
Use cases observed (anonymous categories and counts):
Threshold result: pass | iterate | stop/reposition
Decision and owner:
Linked fixes and retest evidence:
```

An empty template, synthetic run, automated browser test, repository owner walkthrough, or email-link click does not count as a participant or validated use case.
