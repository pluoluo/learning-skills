# Delivery across agent environments

Use the same teaching workflow, contract and build tools across hosts. Adapt discovery and delivery to actual capabilities, not a product name or an assumption that every user has a terminal. No host-specific teaching fork is needed.

## Desktop agents

When native Skill discovery is available, use it; otherwise follow the host's documented loading mechanism. Check access to the skill's complete resources, file creation, Node.js and optional browser preview. Run scripts in the host execution environment; do not instruct a nontechnical user to prepare a development project by default. If a required tool is missing, explain the specific requirement and available path without claiming a build or check succeeded.

Deliver a clickable local file, a native file attachment or a downloadable artifact according to the current host. When interactive HTML previews are available, offer one and retain a downloadable standalone file. A preview's restrictions may differ from a browser; if it blocks the lesson's iframe or scripts, use the standalone file rather than weakening isolation. Do not invent an artifact link, local path or public URL.

Prefer short learner-oriented explanations and follow-up edits. Keep editable lesson content with the delivery so revisions can preserve the same learning need. Codex can be used through desktop and command-line surfaces; select delivery from the active interface.

## Messaging and persistent agents

An output path on the agent's server is not sufficient for the recipient. In the originating request conversation, use the host's supported artifact/attachment mechanism for index.html. Where supported and useful, package the editable content and LICENSE as a ZIP. Keep the embedded license notice when sending the HTML alone.

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
