# Agent-owned delivery and revision

The finished parent-facing result is one HTTP(S) lesson URL. Default to local deployment on a computer in the learner's LAN, reachable by a tablet on that same network. Parents describe changes in conversation; the agent edits, checks and updates the lesson. Do not ask parents to repeat this default in their prompt, edit files, run commands, choose ports or administer a service. Source files and reports are agent-maintained records, not the delivery interface.

## Select a real route early

Inspect the actual environment for a deployment computer or managed service on the learner's LAN. Reuse a suitable local course service where available, preserving its access controls; otherwise use the bundled Node host on the actual LAN interface. A remote authoring agent needs access to such a deployment machine: its localhost or private IP may be on a different network. Do not replace local LAN delivery with public/cloud hosting unless the user requests that mode, and do not infer LAN access from an agent product name.

Use the requested network scope. A request for a URL authorizes ordinary hosting within that scope and existing authorized hosting; it does not by itself authorize making private content public, opening firewall ports, creating tunnels or changing unrelated services. Missing route information matters: ask a targeted question while continuing authoring. If hosting is unavailable, retain the private build and report URL delivery as blocked. An offline file is an alternative only when explicitly requested.

## Public page, private workspace

Keep author/lesson.source.json and its canvas.html, private compiled artifacts, review.json and delivery.json outside the served scope. Only index.html is learner-facing. Never serve the whole author or build directory. Standalone index.html necessarily contains its local practice key; it is not an authoritative assessment. A platform keeps formal keys server-side instead.

## Optional temporary Node host

When no suitable service exists, the bundled dependency-free host serves exactly one built page. Run it with the environment's process manager or persistent tool session; it does not daemonize or assume a shell, OS, fixed path, IP or port:

    node scripts/serve.mjs --lesson /path/to/private/build/index.html --bind <reachable-interface-address> --port 0 --hours 4 --state /path/to/private/delivery.json
    node scripts/serve.mjs --stop /path/to/private/delivery.json

Port 0 lets the OS choose an unused port. For a LAN lesson bind the actual authorized LAN interface, not all interfaces. Default bind is loopback for author preview only. The host does not configure TLS, firewall rules, NAT, DNS or tunnels. Prefer an existing stable route for durable delivery rather than claiming a temporary process is permanent hosting.

The private manifest records the URL, expiry, bind address, process ID and stop token. Treat it as private agent state. The stop command uses its authenticated control endpoint; never expose its token in a learner URL or ask the parent to run it. The host stops automatically after the requested duration, up to 24 hours. It fills the lesson's adult information area with actual expiry and instructions to ask the agent to stop or revise it. For durable hosting with no expiry, state that instead of inventing a time limit.

Hosting availability is independent of learning duration. The --hours setting controls how long the temporary web service runs; it is not a lesson timer, recommended study time or reason to set a ten-minute activity limit.

The host reads the built page for every request. Publish revisions atomically: compile and build to a new private directory, then use serve.mjs --update /path/to/private/delivery.json --lesson /path/to/new-build/index.html. Existing open sessions retain their page; reopening loads the revised lesson. The route and expiry stay the same. To extend the temporary service use --extend /path/to/private/delivery.json --hours 4; this retains its route. The standalone player does not migrate or persist practice state.

## Verify and record evidence

Request the exact learner URL and verify it returns the intended lesson, not just a listening port. Distinguish a server-local request, an author-browser request and a real learner-device request. A local probe is not tablet verification. A demonstrated failure to reach the learner network blocks completed delivery; absence of a physical tablet alone does not prove failure. The lesson may accurately state that device verification is pending.

Record actual URL, audience/network scope, expiry, stop/revision method and performed checks in private delivery state or the host's equivalent. Put concise nontechnical lifecycle and check status inside the page. The built player supplies an adult information area. build.mjs --review embeds only standard status labels from the private report, never its evidence. Existing hosts can supply lifecycle details in that area. Keep iframe isolation and CSP intact. Do not work around browser or network policies.

## Final reply and later changes

After a successful handoff, reply with just one clickable lesson URL. Important limitations belong in the page before handoff. If a material issue or missing route prevents delivery, give a short accurate blocker instead of a success-shaped link.

For a revision, retrieve the existing author workspace and deployment, preserve the original need, edit the single source, compile, validate and repeat relevant checks. Reports are bound to the artifact digest: a previous pass does not prove new content. Update the existing deployment when possible and return its URL. Never ask the parent to synchronize HTML and JSON or repackage the lesson.

## Portability and synchronization

Use Node.js 20+ and resolve paths from this installed skill and the chosen workspace. Do not put Windows drives, local accounts, fixed LAN addresses, developer credentials, agent-specific APIs or deployment accounts in the skill. Choose process management from the executing agent. Synchronize the skill directory only, excluding generated lessons, screenshots, dependency directories, manifests and credentials. These scripts work without package installation except the optional browser runner, which uses an already available Playwright module.
