# Delivery across agent environments

Use the same teaching workflow, contract and build tools across hosts. Adapt discovery and delivery to actual capabilities, not a product name or an assumption that every user has a terminal. No host-specific teaching fork is needed.

## Tablet learning through a persistent agent

The authoring device and learner device are different roles. Prefer a landscape tablet browser for the child's touch interactions; use desktop previews for adult review and editing. For a request to make the lesson available on a tablet or LAN, an agent with a suitable deployment environment can temporarily serve the built output and return a link in the originating conversation. Downloadable HTML/ZIP remains useful for offline access.

### Delivery boundaries

Choose the service, process management, port and hosting mechanism from the actual agent environment. Reuse existing deployment capabilities when appropriate; this Skill does not prescribe a server implementation or bundle a hosting service.

- Provide a working lesson URL intended for the learner's tablet on the reachable LAN. localhost, 127.0.0.1 and a remote server's file path are not tablet delivery addresses.
- Publish only the intended course content. Keep private source materials, user context, credentials and unrelated agent directories outside the served scope.
- Preserve existing services and stay within the requested network scope. Public hosting, tunnels or unrelated network changes require their own authorization.
- State how long the service will remain available, whether it stops automatically, and how this specific service can be stopped. Keep the lesson files for future use and avoid interrupting an active learning session during revisions.
- Verify that the service responds and report what was actually checked. A host-side probe does not establish that a physical tablet can connect; verify or resolve the learner's network access when needed.
- Return the actual URL and instructions in the originating conversation. If hosting cannot be completed, explain the specific limitation and offer the preserved file or attachment rather than inventing a reachable link.

## Desktop agents

When native Skill discovery is available, use it; otherwise follow the host's documented loading mechanism. Check access to the skill's complete resources, file creation, Node.js and optional browser preview. Run scripts in the host execution environment; do not instruct a nontechnical user to prepare a development project by default. If a required tool is missing, explain the specific requirement and available path without claiming a build or check succeeded.

Deliver a clickable local file, a native file attachment or a downloadable artifact according to the current host. When interactive HTML previews are available, offer one and retain a downloadable standalone file. A preview's restrictions may differ from a browser; if it blocks the lesson's iframe or scripts, use the standalone file rather than weakening isolation. Do not invent an artifact link, local path or public URL.

Prefer short learner-oriented explanations and follow-up edits. Keep editable lesson content with the delivery so revisions can preserve the same learning need. Codex can be used through desktop and command-line surfaces; select delivery from the active interface.

## Messaging and persistent agents

An output path on the agent's server is not sufficient for the recipient. When LAN tablet delivery is part of the task, prefer the temporary lesson URL described above. In the originating request conversation, use the host's supported artifact/attachment mechanism for an offline index.html or ZIP when useful. Keep the embedded license notice when sending the HTML alone.

Confirm that the file actually exists before presenting it for delivery. Do not report an attachment as sent unless the host reports success or exposes a verified attachment. If delivery is unavailable or fails, retain the files and explain the limitation. Do not send to a different recipient or publish a hosted webpage without the user's request.

Hermes documents HTML and ZIP delivery through its messaging gateway. In versions using Deliverable Mode, generated paths in ordinary response text can be converted to native attachments; paths inside backticks or code blocks are ignored. Follow the installed version's tools and configuration rather than assuming this is enabled everywhere. The chat application may require downloading HTML and opening it in a browser instead of rendering it inline.

## CLI and other hosts

Save the deliverables in the requested workspace, or an appropriate task output directory when no path was specified. Report the actual file to open and how to request revisions. Preserve support for scripted validation and building without making terminal use the primary user journey.

## Scope of compatibility

Documentation establishes intended integration, not a passed product-level test. Loading a SKILL.md, executing its scripts, previewing HTML and delivering a file are separate capabilities. A plain chat that cannot load resources or run tools may use instructions as context, but has not thereby completed the full Skill workflow.

Official references, checked 2026-10-29:

- [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills) — standalone skill availability and optional desktop metadata.
- [OpenAI: Work with files](https://learn.chatgpt.com/docs/artifacts-viewer) — file delivery and HTML previews when available.
- [Hermes: Deliverable Mode](https://hermes-agent.nousresearch.com/docs/user-guide/features/deliverable-mode) — gateway attachments and supported file types.
