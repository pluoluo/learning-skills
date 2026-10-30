# Portable lesson contract v1

The scripts are the executable structural contract. Read them when an exact boundary matters. Runtime requirement: Node.js 20+; no npm install is needed to validate or build a lesson.

## Agent-only author workspace

Keep one editable source per lesson: author/lesson.source.json has the same design and content fields as the portable document, except content.canvas is {"file":"canvas.html"}; author/canvas.html is the referenced inline page. No duplicate html property is allowed in this mode. Referenced files must remain inside the author directory, including after resolving symlinks. compile.mjs embeds the page and produces portable lesson.json outside the author directory. Edit source files only, then recompile. The parent asks the agent for revisions, not for files or editing instructions.

Legacy inline lesson.json remains a supported complete input. Use either inline authoring or file-based authoring for a lesson, not two independently maintained versions. The portable format and host content schema remain unchanged.

## lesson.json

The root contains:

```json
{
  "format": "interactive-topic-lesson.v1",
  "skillVersion": "0.4.0",
  "title": "Lesson title",
  "subject": "math",
  "need": "The user's original learning need",
  "assumptions": ["An explicitly unverified prerequisite"],
  "learningDesign": {
    "mode": "training",
    "strategy": "Task-appropriate support: a usable method for practice, or goal and constraints for discovery",
    "coverage": [{
      "id": "c1",
      "focus": "The distinction this dimension examines",
      "contrast": "Plausible competing interpretations and how a task distinguishes them",
      "practice": "Concrete practice and learner evidence, not only a question title",
      "testIds": ["q1"]
    }],
    "progression": "How tasks move from entry cases to relevant borderline and transfer cases",
    "evidencePolicy": "How first checks, item hints, retries and limited/untested scope are reported"
  },
  "objectives": [{
    "id": "o1",
    "goal": "An observable learner action",
    "interaction": "What changes through the learner's operation",
    "misconception": "A possible difficulty, not a diagnosis",
    "feedback": "What the learner sees and can try next",
    "testIds": ["q1"]
  }],
  "content": {
    "schemaVersion": 2,
    "layout": "canvas",
    "sourceNote": "Actual source or original supplementary material",
    "gradeNote": "Appropriate prior experience and level",
    "introduction": "A short invitation to operate",
    "sections": [],
    "canvas": { "html": "<!doctype html><html>...</html>" },
    "test": {
      "passScore": 80,
      "questions": [{
        "id": "q1", "prompt": "A new-example question",
        "options": ["Choice A", "Choice B"], "answer": 0,
        "explanation": "Why the answer follows",
        "optionFeedback": ["Why A fits the evidence", "What B captures, why it fails and how to revise"]
      }]
    }
  }
}
```

subject is math, chinese or english. IDs are stable, unique within their collection, at most 40 characters and match [a-zA-Z][a-zA-Z0-9_-]*. All objective testIds must exist; every question must be referenced. One to five objectives and one to fifty questions are resource limits inherited from the current host design. Questions have two to eight distinct choices and a zero-based integer answer. passScore is an integer from 60 to 100.

Version 0.4 routes authoring through the matching references/subjects guide using this existing subject field; it does not add a new public format or scoring engine. In private review.json subject evidence, identify the guide and actual content review performed. The current formal-check player supports single-choice questions. Other learning actions can live in the canvas, but recognizing an option does not by itself establish free expression, a written proof or listening/speaking performance. If a requested outcome requires evaluation the current host cannot provide, raise that boundary instead of silently claiming an equivalent outcome.

For skillVersion 0.3.0 and later, learningDesign is required at the lesson root. Older versions without it remain supported. mode is training or exploration. strategy is 1–500 characters; progression and evidencePolicy are each 1–1000. coverage has 1–20 unique dimension IDs (a resource limit, not a teaching quota), each with focus (1–300), contrast and practice (1–500 each), and nonempty unique testIds referencing real formal questions. Every question maps to a coverage dimension. This metadata stays out of special-study.json. The standalone page receives only dimension IDs, labels and test links for limited practice summaries, not the private design narrative. A structural map is not proof of genuine coverage; review the actual tasks against it.

optionFeedback is an array aligned with options, one nonempty 1–350 character explanation per choice. It is required in training mode and optional for exploration/legacy questions. gradeAnswers returns the selected choice's explanation when available, otherwise the legacy shared explanation. Keep the shared explanation meaningful for compatible hosts. Option-specific explanations stay outside publicQuestions/context until the learner submits; they are answer-bearing data, just like explanation. The standalone summary preserves the first valid check in current-page memory across edits and answer resets, separately from current results. It covers only these formal questions, not the canvas's hinted practice, and is not an authoritative record or mastery judgment.

Content text limits: introduction 500 characters; sourceNote and gradeNote 300; question prompt 300; option 160; explanation 350. Canvas limit: 500,000 UTF-8 bytes and 500,000 JavaScript characters. Entire lesson limit: 1 MB UTF-8. These limits constrain artifacts, not the desired teaching length or amount of practice.

For each objective, the canvas includes a container with data-learning-objective="objective-id" and a feedback element marked data-feedback. Use a naturally sized main element marked data-study-root. Keep all CSS and classic JavaScript inline; do not use modules, external scripts, fonts, fetch, storage, forms, nested frames or popups. Supply a complete HTML document with head and body. The builder adds the standalone host's sandbox and a restrictive CSP, and compiles scripts for syntax without running them. Static checks are a best-effort dependency check, not a proof of safety or teaching correctness.

Formal answer keys and copied formal test data stay outside the canvas. An incidental word or DOM ID that matches a question ID is not evidence of a leaked test. Prefer check_* question IDs for clarity. Explicit formal-question hooks (data-question-id and data-test-id matching a formal ID) are rejected by the static checker, but it cannot prove the absence of copied answers. Teaching exercises may contain their own answers and explanations. The standalone parent needs the formal key for local practice; the host application must keep it server-side.

## Optional host messages

Canvas → parent: {channel: "special-study", type, payload}.

Supported standalone messages: ready → context; resize with a finite number → clamped iframe height; complete → learned; submit with a complete question-ID/option-index map → result; return → exploration; request-test → host test view. The host also exposes its own exploration/test controls, so these messages are optional. When receiving, check event.source === parent and event.data.channel === "special-study". The parent validates event.source against the current iframe window.

The standalone context advertises capabilities:{requestTest:true}. Show a canvas “try a new example” button only when the host advertises that capability; send request-test on activation. If a host omits the capability, the activity remains usable and relies on host-provided navigation without guessing button text. Requesting a test never marks a lesson learned or changes answers.

context includes learned, archived:false, preview:true, standalone:true, and test with prompts/options only. A submit result includes local score, passed, passScore and answer explanations, and explicitly has localOnly:true. No data is persisted. TTS/ASR requests receive an explicit unsupported error, so the canvas must retain a text/action path. See host-integration.md for the platform boundary.

The standalone context also includes optional viewport:{width,height}: CSS pixels available to the learning canvas after host navigation and footer. The host sends a viewport message with the same payload when that space changes. A canvas may use this stable allocation to scale learning objects or establish a minimum workspace height. Continue reporting the actual naturally sized content root through resize, allowing longer content to scroll. Do not derive an ever-increasing root minimum from the auto-sized iframe's current height; the supplied allocation is independent of that feedback. Hosts that omit viewport remain compatible: retain a usable natural-content layout.

## Private build products

- index.html: standalone player plus isolated canvas, local tests and explanations; opens using file:// without a server.
- lesson.json: editable complete artifact including the design and formal keys. It contains no learner identity or personal history.
- special-study.json: content only, for a host's server-side parser and human review. Do not expose it as a student API response.
- validation.json: artifact digest, actual static check results and limits of that validation. Rebuilding is deterministic for the same input.
- LICENSE: the MIT license for the reused standalone player; index.html also embeds the complete notice. New lesson content and user-provided materials retain their respective rights.

- review.json: digest-bound scaffold with separate structure/script, browser, subject and learner-effectiveness statuses and evidence. New builds default to not_run outside actual static checks. An optional --review input must match the digest; only whitelisted status labels enter the page. Browser runs create browser-report.json and screenshots privately for the agent to inspect, not a claim of learner effectiveness.

The parent-facing deliverable is one reachable URL, not this file list. The player displays an adult information area with actual review status and agent revision instructions. A temporary host supplies availability and stop instructions there.

For skill maintenance, run node scripts/self-test.mjs. It tests compilation, learning-design/option-feedback structure, validation, report binding, selected-choice grading, first-check preservation, player event/state behavior using a minimal DOM double, and a temporary loopback host including update, stop and expiry. Fixtures are created outside the skill and removed afterwards. No package installation is needed. The DOM double is not a real browser; these checks cannot establish instructional coverage, visual quality, physical-tablet access or actual learning effectiveness.
