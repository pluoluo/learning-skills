# Working on learning-skills

Read README.md and the relevant SKILL.md before editing. Check git status and preserve others' work.

The reusable teaching rules and artifact tooling live in skills/interactive-topic-lesson. Keep application identity, credentials, database access, publishing and authoritative learning records in the host application.

Treat user observations, interpretations and unknowns separately. Do not expose private student context in shared examples. Use original or explicitly licensed material.

Run npm test for tooling changes, npm run example:check for the published example, and npm run test:browser when changing the player or example interactions. Static validation, browser behavior and teaching effectiveness are separate claims; report only the checks actually performed.

Keep generated distributions, browser downloads, screenshots and private inputs out of Git. Commit example source, reproducible tools and focused tests. Do not duplicate teaching rules inside a host adapter. Do not add personal progress or handoff documents; use commits and issue descriptions for public development records.

Before publishing a README or release preview, open and inspect the exact final image file. A ready iframe DOM or passing interaction checks do not prove its content was painted in the screenshot. Verify the uploaded asset and rendered README image as well; use a new asset URL when replacing a cached broken preview.
