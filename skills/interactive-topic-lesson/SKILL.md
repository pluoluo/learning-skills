---
name: interactive-topic-lesson
license: MIT
description: Create interactive topic learning and practice in Chinese, mathematics or English through one entry point, loading the matching subject guidance. By default, deploy locally and deliver one LAN URL for a tablet on the same network; the agent owns later revisions. Use for 互动专题、互动小课、专题训练、知识点探索; printable exam layout is separate.
metadata:
  author: pluoluo
  version: "0.4.0"
---

# Interactive topic lesson

Build a coherent topic learning experience: appropriate support, meaningful operations, practice across relevant confusions, feedback about the learner's actual response, and checks in new cases. A functioning webpage or a few easy choices are not sufficient evidence that the learning need has been addressed. The parent receives one working lesson URL; the agent owns authoring, checking, hosting and later revisions. Use the user's language, supplied curriculum and design constraints.

Default delivery is a lesson hosted on a computer in the learner's LAN, opened by a tablet on that same network. The agent handles local deployment, checks, private editable sources and revisions, then replies with one lesson URL. These defaults belong to the skill: do not ask parents to repeat them in a usage prompt. Change them only when the user requests a different delivery mode.

Requires file-writing tools, Node.js 20+ and a reachable hosting route for completed URL delivery. The lesson itself is self-contained and needs no account, API key or remote dependencies. Browser automation is optional; unavailable checks must remain unverified.

## Understand the learning need

Accept a natural-language request; a textbook, wrong answer or diagnostic test is not a prerequisite. Retain what the user actually reported. Separate observations, interpretations and assumptions. An unspecified obstacle is a reason to offer a useful starting exploration, not to invent a diagnosis.

Help the user supply useful context rather than expecting them to know the input contract. Establish the topic; invite grade or prior experience and the observed difficulty or learning intention. A concrete example, desired observable change and interaction preferences are optional refinements. If something material is missing, ask a concise targeted question; otherwise proceed with stated assumptions. Do not make a worksheet, textbook, exact diagnosis, complete lesson plan, output path or technical configuration a prerequisite.

There is no default lesson duration. Choose the activity's scope from the learning goal and necessary exploration, feedback and new-example check. Do not ask for minutes just to fill a prompt, inherit a duration from unrelated examples, pad activities to hit a time target, or add timers or minimum-time gates by default. If the user supplies an available-time preference, use it to adjust scope and treat any estimate as flexible; explicit timed-task requests remain supported.

Identify the recent learning scope and an observable goal. A learner who can perform a procedure but misses its conditions needs an activity about finding and connecting conditions; restarting every definition may miss the request. Knowledge organization can compare relationships and limits rather than follow a remedial sequence. Ask only for information that would materially change the activity and cannot be reasonably assumed.

## Select subject guidance

Infer the subject from what is being learned, not the interface language: an English lesson explained in Chinese is still english. Record the corresponding subject value. Before designing content, read the matching guide below together with the shared teaching and learning-design references. Load only the subject guidance needed for this lesson; parents do not need to choose a sub-skill or repeat its rules.

| subject | Read | Main decisions owned there |
| --- | --- | --- |
| chinese | [references/subjects/chinese.md](references/subjects/chinese.md) | Text evidence, scope of interpretation, material quality and valid expressions |
| math | [references/subjects/math.md](references/subjects/math.md) | Mathematical conditions, representations, reasoning and error analysis |
| english | [references/subjects/english.md](references/subjects/english.md) | Language form, meaning, context and the skill actually being practised |

If the subject is genuinely ambiguous and changes the activity, ask one targeted question while continuing independent work. The current portable format declares one subject per lesson. For a genuine cross-subject request, identify the primary learning goal and read additional guidance only where it contributes; if separate goals cannot be represented honestly as one lesson, explain the scope choice rather than silently omitting a subject or inventing a new format.

Subject guides refine teaching decisions, not the shared artifact contract, interaction rules or delivery defaults. They do not mandate one layout, sequence, grade-specific formula or teaching method. A subject's test examples must not become rules for the other subjects. When the requested outcome needs an unsupported evaluation or service, explain the specific gap and viable choices to the user before substituting a weaker outcome or expanding capability.

## Design and make the activity

Read [references/teaching.md](references/teaching.md) and [references/learning-design.md](references/learning-design.md) for method, coverage, progression and feedback design, then [references/contract.md](references/contract.md) for the portable artifact format. A host integration request additionally uses [references/host-integration.md](references/host-integration.md).

Before writing the page, record a concise design in the agent-only author workspace (see contract.md): original need, assumptions, objectives, the action and feedback for each objective, and its new-example check. Objectives must describe what the learner can do. Choose the number and interaction form that the content needs; the validator's resource limits are not teaching quotas.

For a reported difficulty or a request for training, use training mode and record learningDesign: a concise strategy, a coverage map of relevant confusions and contrasts, the linked operations and new checks, progression, and how first checks/hints/retries will be interpreted. Do not assume one demonstration covers a topic. A curiosity-led exploration can use exploration mode and a narrower stated scope without claiming weakness coverage. New 0.3+ lessons require this design; older artifacts remain supported.

Describe the shortest useful action → visible consequence → judgment sequence. Each extra confirmation or reset must have a distinct purpose. Minimize redundant navigation, not learning depth or relevant practice. Visible labels, current states and the effects of actions must be consistent. Apply the interaction review in teaching.md and audit materials with learning-design.md. An eventual correct result does not excuse an ambiguous route or a set of trivial items.

Use one author source: lesson.source.json plus its referenced canvas.html. Compile these into portable lesson.json; generated build products are not separate editing targets. Create complete inline HTML/CSS/classic JavaScript in canvas.html; compilation embeds it under content.canvas.html. The first screen must make the learning action clear and operable. Provide a concise method or worked help when it supports the task; for discovery, give a clear goal and constraints without disclosing the relationship being investigated. Let learners change, compare, construct or express something, see consequences and try again. On an error, explain what the response captures and where it fails using task evidence, then offer a concrete revision move. Support hints, revisiting and stopping without forcing a sequence of perfect answers. Keep controls operable by touch and keyboard; provide a click alternative to dragging.

Adapt to available width and height, not only width breakpoints. On larger views, enlarge or reorganize the actual learning objects and controls so the activity remains the focus rather than a small strip above unused space. Preserve geometric proportions, readable text and compact-screen access; avoid filling height with empty decoration. The standalone host supplies optional viewport dimensions (see contract.md); keep sizing feedback independent of the iframe's own expanding height.

Generate formal check questions separately in content.test. Training-mode questions need optionFeedback aligned to each option, not only a shared explanation. Check answers and visual quantities independently of their labels. Use plausible distractors to distinguish relevant confusions; vary structure and reasoning demand as well as surface details. Make scope and untested areas clear. Retain uncertainty for open expression rather than manufacturing a correctness judgment.

Keep the canvas independent of the standalone player's navigation and test UI. Use the optional request-test message when the host advertises it, rather than naming or duplicating an outer navigation button; it must still operate before any host response. Do not place formal answer keys, student identity, credentials, remote dependencies or database writes in the canvas.

## Validate, repair and deliver

Read [references/agent-delivery.md](references/agent-delivery.md) early to identify the local deployment machine and its reachable LAN interface. Tablet browsers are the primary learning surface. Keep paths and process management portable across desktop, CLI and persistent remote agents. A remote authoring agent must use a machine or authorized service on the learner's LAN; its own private IP may be on a different network. Host only the built learner page; keep sources, formal content packages and reports private. A loopback-only check does not prove tablet access.

From the installed skill directory, run:

```bash
node scripts/compile.mjs /path/to/author/lesson.source.json --out /path/to/private/lesson.json
node scripts/validate.mjs /path/to/private/lesson.json
node scripts/build.mjs /path/to/private/lesson.json --out /path/to/private/build
```

Resolve scripts relative to this SKILL.md; do not assume the user is in the skill directory. Write results to the requested workspace, not into the installed skill. The builder refuses existing output files unless --force is supplied for an intended rebuild.

Validation checks structure, references, classic script syntax and some dependency hazards. Its report does not establish teaching correctness or browser behavior. Review actual strategy, coverage, progression and every selected-option feedback against the selected subject guide, learning-design.md and teaching.md, not just final answers. In private review.json subject evidence, name the loaded guide and performed content checks, including the most ambiguous case and any outcome that the interactions cannot establish. Record browser/learner checks separately; never replace not_run with passed without evidence. For the optional repeatable browser runner, read [references/browser-check.md](references/browser-check.md); it uses an available Playwright installation and does not install a browser or fix access policy. If a browser is available, exercise the primary operation, distinct wrong options where present, a hint or reset, new-example checks, learning-summary interpretation and keyboard interaction at the requested sizes. The default shipped sizes are 1000×600 and 1920×1080 CSS pixels; adapt them when the user requests another context.

Inspect the rendered composition as well as operation: meaningful use of screen height, actual diagram size, control reachability and overflow. Resize a live lesson in both directions and open/close support to catch retained heights or resize loops, while preserving learner input. Distinguish CSS viewport size from physical pixel density or browser zoom; record which was tested. Passing interaction tests alone is not a responsive-layout acceptance result.

Repair specific failed checks while preserving completed work and the user's original need. Limit autonomous repair to two passes; if a material problem remains, report the blocker and retain the private draft rather than hand off a broken learner URL. Never claim independent review that did not happen.

Build and retain index.html, lesson.json, special-study.json, validation.json, review.json and LICENSE for agent maintenance and platform use. Keep the player's embedded MIT notice. The user's new lesson content and supplied materials retain their respective rights. Local practice scores describe this attempt only; they are not a mastery diagnosis or an authoritative host record.

On successful lesson delivery, the final reply contains exactly one clickable lesson URL. Put availability, stop/revision instructions and honest check status inside the lesson's adult information area. Do not offer parents JSON, ZIPs, source paths or manual editing steps unless they explicitly request developer artifacts. If no reachable URL can be provided, say delivery is blocked and name the missing capability; do not invent a URL or present a file as completed delivery. Later edits are agent work: revise the author source, recheck, and update the existing route when possible without interrupting an active session.
