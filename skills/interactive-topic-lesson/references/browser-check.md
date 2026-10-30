# Repeatable browser checks (optional)

Use the environment's permitted browser tools or this runner with an already available Playwright module. Do not install a browser, bypass an access policy or assume a fixed module path. An unavailable browser remains not_run; it does not block static authoring. A known material browser failure must be repaired before completed learner handoff.

    node scripts/check-browser.mjs private/lesson.json --url <authorized-preview-url> --plan private/browser-plan.json --out private/browser

Use --module /path/to/playwright/index.mjs only when a module entry is supplied by the actual environment. Paths and screenshots belong in the agent workspace, not the synchronized skill directory. The runner supports Chromium; other permitted browser tools can perform the same checks with recorded evidence.

## Action plan

The agent writes a small JSON plan from the actual authored controls, not guessed selectors. Cases start with a fresh lesson at each CSS viewport; their steps must navigate as needed. Required case IDs are primary, wrong, support, transfer, keyboard and responsive. These are acceptance coverage, not required lesson sections or teaching quotas. Every case needs at least one observable assertion. Use an actual key action for keyboard, and resize in both directions with an assertion of retained input for responsive.

Within these cases, cover selection and changing a selection before checking, one direct check, editing a checked answer and checking again. Assert the relevant learning consequence and removal of stale displays/results, not only the eventual score. If the design includes linked evidence, verify that it belongs to the current response and does not perform the intended reasoning for the learner. Check reset/restore visibility and effect for the current state; a single-choice activity needs no reset before checking, while a multi-step construction may meaningfully restore its initial configuration. Review whether button names match effects and whether two buttons unnecessarily perform one confirmation. The runner does not infer these semantics from labels; the plan and agent review must test them.

For each interaction pattern, compare the effect implied by the visible controls with its actual consequence, including reversal where relevant. The chosen convention must make actions and states understandable; successfully changing a value alone is insufficient. Teaching complexity and plausible distractors still require subject review rather than DOM assertions.

In training, inspect the initial usable strategy and exercise materially different wrong options where available. Their explanations must analyze their different errors using task evidence. Check an item-specific hint followed by a correction, rechecking the same answer, and a reset: the learning summary must distinguish earlier first checks from current success and not relabel supported retries as new independent success. Verify the coverage map against actual item variation, not just labels or item counts. These teaching judgments belong in subject review evidence; the runner cannot infer them from the DOM.

Example step forms (replace selectors and text with the real lesson's controls):

```json
{
  "viewports": [{"width":1000,"height":600},{"width":1920,"height":1080}],
  "cases": [{
    "id":"primary",
    "steps":[
      {"op":"click","selector":"#grow-width"},
      {"op":"text","selector":"#feedback","value":"the actual predicted change"}
    ]
  }]
}
```

This abbreviated example needs the other five cases before it can run. Steps support click, press, fill, text (substring assertion), visible (boolean value, default true) and resize (width,height). Selector steps default to scope:"canvas"; use scope:"player" for host controls. press uses value:"Enter", "Space" or another Playwright key. Responsive steps may change dimensions within a case; inspect controls, open/close support and confirm input survives a large→small→large or small→large→small cycle.

The runner checks the served artifact digest, script/console errors, horizontal overflow, clipped control bounds and learning-root clipping. It records diagram sizes rather than imposing a universal minimum: geometric meaning and meaningful screen use still need visual review. It writes browser-report.json and screenshots. Inspect images as well as operation; automated bounds are not visual acceptance. A screenshot failure fails the run. CSS pixels are not physical device pixels or proof of touch behavior.

## Review record

build.mjs generates review.json with artifactSha256 and four checks: static, browser, subject and learnerEffectiveness. Each has status passed|failed|not_run and an evidence array. Record actual method, sizes, scenario results and private screenshot/report locations. A browser pass requires both the performed interactions and the agent's visual inspection; a runner pass alone does not establish that composition is good. Subject review recomputes answers and representations separately. Learner effectiveness needs actual learner observation.

After reviewing, rebuild with --review /path/to/review.json. The report must match the current artifact digest; changing content invalidates old reports. Only status labels are embedded in the parent's course-information area, never private evidence. Do not automatically promote browser or learner status merely because build or validate succeeded. A separately performed browser run may be recorded manually if this optional runner was unavailable.
