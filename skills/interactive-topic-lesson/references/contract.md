# Portable lesson contract v1

The scripts are the executable structural contract. Read them when an exact boundary matters. Runtime requirement: Node.js 20+; no npm install is needed to validate or build a lesson.

## lesson.json

The root contains:

```json
{
  "format": "interactive-topic-lesson.v1",
  "skillVersion": "0.1.0",
  "title": "Lesson title",
  "subject": "math",
  "need": "The user's original learning need",
  "assumptions": ["An explicitly unverified prerequisite"],
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
        "explanation": "Why the answer follows"
      }]
    }
  }
}
```

subject is math, chinese or english. IDs are stable, unique within their collection, at most 40 characters and match [a-zA-Z][a-zA-Z0-9_-]*. All objective testIds must exist; every question must be referenced. One to five objectives and one to fifty questions are resource limits inherited from the current host design. Questions have two to eight distinct choices and a zero-based integer answer. passScore is an integer from 60 to 100.

Content text limits: introduction 500 characters; sourceNote and gradeNote 300; question prompt 300; option 160; explanation 350. Canvas limit: 500,000 UTF-8 bytes and 500,000 JavaScript characters. Entire lesson limit: 1 MB UTF-8. These limits constrain artifacts, not the desired teaching length or amount of practice.

For each objective, the canvas includes a container with data-learning-objective="objective-id" and a feedback element marked data-feedback. Use a naturally sized main element marked data-study-root. Keep all CSS and classic JavaScript inline; do not use modules, external scripts, fonts, fetch, storage, forms, nested frames or popups. Supply a complete HTML document with head and body. The builder adds the standalone host's sandbox and a restrictive CSP, and compiles scripts for syntax without running them. Static checks are a best-effort dependency check, not a proof of safety or teaching correctness.

Formal question IDs and answer keys stay outside the canvas. Teaching exercises may contain their own answers and explanations. The standalone parent needs the formal key for local practice; the host application must keep it server-side.

## Optional host messages

Canvas → parent: {channel: "special-study", type, payload}.

Supported standalone messages: ready → context; resize with a finite number → clamped iframe height; complete → learned; submit with a complete question-ID/option-index map → result; return → exploration. The host also exposes its own exploration/test controls, so these messages are optional. When receiving, check event.source === parent and event.data.channel === "special-study". The parent validates event.source against the current iframe window.

context includes learned, archived:false, preview:true, standalone:true, and test with prompts/options only. A submit result includes local score, passed, passScore and answer explanations, and explicitly has localOnly:true. No data is persisted. TTS/ASR requests receive an explicit unsupported error, so the canvas must retain a text/action path. See host-integration.md for the platform boundary.

## Delivered files

- index.html: standalone player plus isolated canvas, local tests and explanations; opens using file:// without a server.
- lesson.json: editable complete artifact including the design and formal keys. It contains no learner identity or personal history.
- special-study.json: content only, for a host's server-side parser and human review. Do not expose it as a student API response.
- validation.json: artifact digest, actual static check results and limits of that validation. Rebuilding is deterministic for the same input.
