# Portable lesson contract v1 — 0.5 learning evidence

Node.js 20+ is needed to compile, validate and build; those tools need no npm installation. The generated page remains self-contained. Browser checking uses the agent's existing tools.

## Single author source

Keep author/lesson.source.json and its referenced canvas.html as the editable source. content.canvas is {"file":"canvas.html"}; compile.mjs embeds it into a portable lesson.json outside the author directory. Referenced files and symlinks must stay inside that directory. Do not edit both source and generated copies. Legacy inline lesson.json remains supported.

From skill 0.5.1, new authoring also keeps private teaching-plan.md and presentation-plan.md with their respective review findings before lesson-specific web implementation; see [authoring-process.md](authoring-process.md). They are pedagogical design inputs, not alternative executable sources or additional learner deliverables. The portable schema and existing lesson compatibility are unchanged; these files are not embedded or verified semantically by the compiler.

## A lesson without choice questions

```json
{
  "format": "interactive-topic-lesson.v1",
  "skillVersion": "0.5.0",
  "title": "What does this construction show?",
  "subject": "math",
  "need": "The actual reported learning need",
  "assumptions": ["A prerequisite not yet observed"],
  "presentation": {"mode":"canvas"},
  "objectives": [{
    "id":"o1", "goal":"Construct and explain a case",
    "interaction":"Change the object and compare consequences",
    "misconception":"A possible interpretation to investigate, not a diagnosis",
    "feedback":"Preserve the work and review its reason",
    "evidenceIds":["reason"]
  }],
  "learningDesign": {
    "mode":"training", "strategy":"Learner construction followed by an explanation",
    "coverage":[{
      "id":"c1", "focus":"The relationship under investigation",
      "contrast":"Which relevant conditions differ",
      "practice":"What the learner constructs and revises",
      "evidenceIds":["reason"]
    }],
    "progression":"How changing the case requires more than surface recognition",
    "evidencePolicy":"Preserve first work, revisions and shown help; open reasons await review"
  },
  "evidenceTasks":[{
    "id":"reason", "title":"Explain your construction", "kind":"explanation",
    "evaluation":{"type":"human-review","criteria":["Does the reason use the actual work?"]}
  }],
  "content": {
    "schemaVersion":2, "layout":"canvas", "sections":[],
    "sourceNote":"Actual source or original supplementary material",
    "gradeNote":"Appropriate prior experience, not a diagnosis",
    "introduction":"A short invitation to operate",
    "canvas":{"file":"canvas.html"}
  }
}
```

subject is math, chinese or english. IDs match [a-zA-Z][a-zA-Z0-9_-]* and are at most 40 characters. There are 1–5 objectives and 1–20 coverage dimensions as resource limits, not teaching quotas. Each objective has goal, interaction, misconception and feedback of 1–500 characters.

For 0.5+ objectives and coverage dimensions may reference testIds, evidenceIds or both, with at least one real reference. Every declared choice question and evidence task must map to an objective and coverage dimension. The shape of evidenceTasks and the submission/record contract are defined in [learning-evidence.md](learning-evidence.md). At least one choice check or evidence task is required; an activity cannot claim a checked objective without any stated evidence route.

learningDesign is required from 0.3: mode is training or exploration; strategy is 1–500 characters; progression and evidencePolicy are each 1–1000. Each coverage dimension has a unique id, focus (1–300), contrast and practice (1–500 each), and its links. This design stays outside special-study.json. A structural map proves only reference consistency, not instructional depth or coverage quality.

## Presentation and optional recognition

For 0.5+ the default presentation.mode is canvas: the authored activity owns its learning flow. The host initially shows only the available supplementary actions, such as 本次记录 and an optional 辨析核对; 返回学习 appears when leaving the activity. It does not demand two stations, a fixed stage count or a separate end quiz. mode:tabs explicitly selects the older navigation style. Pre-0.5 lessons retain tabs by default.

There is no default question count. Layout adapts to the authored content; an odd final card spans both columns. Do not pad a lesson for symmetry or require a particular fraction of question types. Use choice questions only when recognizing a supplied alternative is useful evidence for the goal. New-case checks can instead be constructions or explanations inside the canvas, captured as evidence tasks.

content.test may be omitted in 0.5+. If supplied, it contains passScore (integer 60–100 for compatibility) and 1–50 questions. Each question has a stable id, prompt (1–300), 2–8 distinct options (1–160 each), zero-based integer answer and explanation (1–350). optionFeedback contains one 1–350 character explanation per choice and is required in training mode. Keep explanation meaningful for legacy hosts too. Diagram objects are not part of this portable formal-check format.

The current formal renderer remains single-choice. Its page is labelled 辨析核对, states that it checks recognition rather than construction/reasoning, and shows scoped counts instead of a percentage grade. The old submit result still contains local score/passed/passScore for API compatibility; these are not a mastery judgment. First submitted responses remain distinguishable from edits and retries in page memory. Coverage dimensions without choice links do not appear as zero-question quiz results.

The player supplies the correctness prefix. Write explanation/optionFeedback as the reason directly, without “对。…” or “错误。…”. Choice explanations are answer-bearing data and stay outside publicQuestions/context until submission. The local standalone source necessarily contains its own keys; formal host applications keep them server-side.

## Canvas boundaries and sizing

Each objective needs a container with data-learning-objective="objective-id", plus a feedback element marked data-feedback. Use main[data-study-root] with natural content height. Supply complete HTML/head/body with inline CSS and classic JavaScript. No modules, external scripts/fonts/resources, forms, nested frames, popup, network/storage APIs or database writes. The builder compiles script syntax without executing it and adds the isolated iframe's restrictive CSP; static checks alone do not certify safety or content correctness.

Formal choice keys and copied formal questions stay outside the teaching canvas. Incidental matching words/IDs are allowed, while explicit data-question-id or data-test-id hooks matching a formal question are rejected. Canvas learning exercises may have their own explanations and answers.

context.viewport:{width,height} is the host's stable allocation in CSS px after its header/footer. A viewport message updates it on size changes. At 1000×600 this can leave about 400–470px; use the actual value, not those approximate constants. Organize essential controls and feedback around the allocation, and allow deliberate scrolling for longer material. Continue reporting natural root height. Do not derive an ever-growing minimum from the iframe's own auto-expanded height. Hosts without this message still need a usable natural-content fallback.

The host keeps navigation and check/save actions reachable while longer question/record content scrolls inside its region. Wrapped question labels retain native fieldset/legend semantics with an outer visual border.

## Host messages

Canvas sends {channel:"special-study",type,payload}; responses use the same channel. Check event.source===parent in the canvas; the parent accepts only its actual lesson frame's messages.

- ready → context: learned, archived:false, preview:true, standalone:true, viewport, capabilities and public optional test data.
- capabilities.requestTest reflects whether actual choice questions exist. Show a request-test control only when advertised; otherwise do not guess outer button labels. Requesting a check never marks a lesson learned.
- capabilities.evidence reflects available evidenceTasks. Public task descriptors include id/title/kind/evaluationType. evidence submissions and evidence-result responses are detailed in learning-evidence.md; request-records opens the local records surface.
- resize carries a finite height clamped to 160–4000px. complete acknowledges the activity's local completion signal; it is not evidence of mastery. return reopens the activity.
- submit accepts a complete real question-ID/option-index map and returns result/error with localOnly:true. A lesson without choice questions rejects formal submit rather than manufacturing a score.
- tts/asr return an unsupported error in the standalone player; retain text and action paths.

## Private build products and local learner records

The agent keeps index.html, lesson.json, special-study.json, validation.json, review.json and LICENSE. index.html embeds the MIT notice; supplied/new material retains its respective rights. Content limit is 1MB UTF-8 overall, canvas 500000 bytes/characters, introduction 500 characters, sourceNote/gradeNote 300 each.

review.json is bound to the artifact digest and separates static, browser, subject and learnerEffectiveness statuses/evidence. Only actually performed checks may be passed. Rebuild with --review after reviewing; content changes invalidate old passes. Browser screenshots/reports are private review material, not automatically learner records.

Learning records stay in page memory until refresh/close. The user may save them as readable HTML with an embedded interactive-topic-lesson.record.v1 snapshot bound to the artifact digest. Numeric checks are limited to declared conditions; human-review responses remain pending. Saving or entering text is never a correctness, completion or mastery assessment. This is different from private author files and needs no parent JSON editing. It has no automatic upload, cross-device persistence or authoritative identity.

special-study.json contains content only. Root presentation/evidenceTasks/design are not silently copied into the old host schema. A legacy platform requiring content.test, or lacking evidence support, needs an explicit adapter before importing 0.5 lessons; do not invent placeholder choice questions or claim platform support. See [host-integration.md](host-integration.md).

The parent-facing course deliverable remains a reachable URL. File handoff is supported only when requested. Development/update work can include the relevant source and test details. Run node scripts/self-test.mjs plus repository tests for tool changes; browser and real learner evidence remain distinct.
