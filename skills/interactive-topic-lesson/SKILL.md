---
name: interactive-topic-lesson
license: MIT
description: Create a self-contained interactive learning lesson around a concrete learning difficulty, concept relationship, or curiosity. Produces a browser lesson plus a validated content package for host applications. Use for 互动专题、互动小课、知识点探索 and learning-by-doing activities; printable exam layout is a separate task.
metadata:
  author: pluoluo
  version: "0.1.2"
---

# Interactive topic lesson

Turn a learning need into an activity the learner can operate, interpret and revisit. Deliver an actual runnable artifact in the user's working directory. Use the user's language, supplied curriculum and design constraints.

Requires file-writing tools and Node.js 20+ for validation and packaging. Browser automation is optional. The generated lesson needs no account, API key, learning platform or network connection.

## Understand the learning need

Accept a natural-language request; a textbook, wrong answer or diagnostic test is not a prerequisite. Retain what the user actually reported. Separate observations, interpretations and assumptions. An unspecified obstacle is a reason to offer a useful starting exploration, not to invent a diagnosis.

Help the user supply useful context rather than expecting them to know the input contract. Establish the topic; invite grade or prior experience and the observed difficulty or learning intention. A concrete example, desired observable change, available time and interaction preferences are optional refinements. If something material is missing, ask a concise targeted question; otherwise proceed with stated assumptions. Do not make a worksheet, textbook, exact diagnosis, complete lesson plan, output path or technical configuration a prerequisite.

Identify the recent learning scope and an observable goal. A learner who can calculate but misses relevant conditions needs an activity about finding and connecting conditions; restarting every definition may miss the request. Knowledge organization can compare relationships and limits rather than follow a remedial sequence. Ask only for information that would materially change the activity and cannot be reasonably assumed.

## Design and make the activity

Read [references/teaching.md](references/teaching.md) for the teaching and review criteria, then [references/contract.md](references/contract.md) for the portable artifact format. A host integration request additionally uses [references/host-integration.md](references/host-integration.md).

Before writing the page, record a concise design in lesson.json: original need, assumptions, objectives, the action and feedback for each objective, and its new-example check. Objectives must describe what the learner can do. Choose the number and interaction form that the content needs; the validator's resource limits are not teaching quotas.

Create complete inline HTML/CSS/classic JavaScript under content.canvas.html. The first screen must offer a meaningful topic-related action. Let learners change, compare, construct or express something, see its consequences and try again. Support hints, revisiting and stopping without forcing a sequence of perfect answers. Keep controls operable by touch and keyboard; provide a click alternative to dragging.

Generate formal check questions separately in content.test. Check answers and visual quantities independently of their labels. Cover the objectives and include a new example; a repeated demonstration is limited practice evidence. Retain uncertainty for open expression rather than manufacturing a correctness judgment.

Keep the canvas independent of the standalone player's navigation and test UI. It can send the optional special-study messages described in the contract; it must still operate before any host response. Do not place formal answer keys, student identity, credentials, remote dependencies or database writes in the canvas.

## Validate, repair and deliver

Choose delivery for the actual host capabilities using [references/agent-delivery.md](references/agent-delivery.md). Desktop agents are the primary interaction scenario; messaging agents are also important, and CLI remains supported. The agent handles tool execution and environment checks. Give the user an accessible course artifact and a clear next action rather than shell instructions or a remote machine's file path alone.

From the installed skill directory, run:

```bash
node scripts/validate.mjs /absolute/path/to/lesson.json
node scripts/build.mjs /absolute/path/to/lesson.json --out /absolute/path/to/delivery
```

Resolve scripts relative to this SKILL.md; do not assume the user is in the skill directory. Write results to the requested workspace, not into the installed skill. The builder refuses existing output files unless --force is supplied for an intended rebuild.

Validation checks structure, references, classic script syntax and some dependency hazards. Its report does not establish teaching correctness or browser behavior. Review the actual content against teaching.md. If a browser is available, exercise the primary operation, a wrong attempt, a hint or reset, the new-example check and keyboard interaction at the requested sizes. The default shipped sizes are 1000×600 and 1920×1080 CSS pixels; adapt them when the user requests another context.

Repair specific failed checks while preserving completed work and the user's original need. Limit autonomous repair to two passes; if a material problem remains, deliver the draft and explain that problem instead of claiming the lesson is verified. A second model or reviewer is useful when available, but never claim independent review that did not happen.

Deliver index.html for direct opening, lesson.json for editable design and content, special-study.json for host consumption, validation.json for the performed static checks, and LICENSE for the reused MIT-licensed player. Keep its embedded notice when sharing the standalone HTML. The user's new lesson content and supplied materials retain their respective rights. Describe what was actually verified and any remaining review. Local practice scores describe this attempt only; they are not a mastery diagnosis or an authoritative host record.
