# Teaching and review criteria

## Connect the need to the experience

State the user-reported need faithfully, the recent focus and any unverified assumptions. Avoid upgrading a parent's interpretation or one incorrect answer into a diagnosis. When only a topic is given, provide a useful exploration and a choice of direction. Do not require a preliminary exam to create a lesson.

Each objective connects a concrete learning object, an allowed learner action, the resulting change or invariant, useful feedback, optional help and a check in another example. A title, a rule list, a decorative animation or a Next button does not establish that connection. Interaction types should vary with the subject and need.

When the user asks for conceptual depth and active thinking, identify what the learner must predict, construct, transform or explain before choosing controls. A page called a workshop or assembly bench can still be only a quiz if every meaningful act is picking a supplied answer. Include an operation whose consequence the learner can investigate and use as evidence; choose its form from the subject. Simple choices can support an entry example or check, but the standalone player's single-choice checks must not determine the whole learning design. State what thinking remains unobserved.

Use the learning goal to set scope, not an invented minute count. A small lesson focuses on a coherent learning need; it has no fixed duration, stage-time quotas or minimum time before continuing. Let learners explore, retry, revisit and stop at their own pace. A user-supplied time preference can guide how much content to include without becoming a forced completion time.

Keep the early explanation short enough to leave the main operation visible. Explain a result in terms of the learner's actual action and relevant relationship. Give specific support for a mistake and a chance to retry or change the object. Help is optional and may include a short demonstration; using it is not failure. Do not equate a hinted answer with independent performance.

For a consequential wrong attempt, explain the learner's selected answer: what it captures, where it fails relative to evidence, and one useful revision move. A shared question pointing only at the correct answer is insufficient. Give concise reasoning before retry; an optional fuller explanation can reveal and compare answers. Keep first checked responses, item-hinted responses and retries distinguishable without adding identity tracking or inflating a final score into independent success. Use learning-design.md to review strategy, coverage and progression across the topic.

Before accepting the content, answer the three required task-authenticity questions in [authoring-process.md](authoring-process.md#任务真实性三问必答): can this task be answered incorrectly, which is the weakest task and can recitation/trial-and-error solve it, and what new ability does the learner actually get to exercise? An invariant guaranteed by supplied conditions is a demonstration, not independent evidence. Prefer the smallest natural case that distinguishes the target confusion, rather than extreme numbers chosen to manufacture difficulty.

## Make each operation clear and necessary

- Distinguish not selected, selected but unchecked, checked, and changed after checking. Feedback must describe the actual learning action and, only where needed, the concrete next action. A visual selected state can be sufficient; avoid empty acknowledgments such as “已修改。可以再核对，也可以继续回看。”
- Show the relevant consequence when the learner acts. Choose its form from the goal: a changed object, comparison, text, evidence link or another interpretable response. Highlighting is optional, not a requirement for every reading activity. If finding evidence is itself the task, automatic highlighting must not perform it for the learner. Any evidence display must remain relevant to the current response, and old displays must update when the response changes. Keep independent formal checks free of answer-revealing help before submission, or identify them as supported practice.
- Use immediate feedback or one explicit check action for a simple choice. Do not add a preview/“look at my choice” gate followed by another confirmation merely to obtain the same judgment. Additional steps are justified only when they make a distinct learning decision, such as selecting a claim then selecting evidence. Optional explanation is a separate disclosure, not another submission.
- Button labels name their actual effect, e.g. “检查答案”, “显示原文依据”, “展开解释” or “恢复全部信息卡”. Do not label a judging action as merely viewing a choice or a destructive reset as simply trying again. Keep wording short and suited to the learner, without imposing one label on all subjects.
- Make the current state and the next action distinguishable using the chosen interaction convention. A state marker need not be an action label, but the complete visible control must make its effect predictable. Do not rely only on color, a hidden accessible label or trial-and-error to explain an inverted action. A reversible manipulation should have an understandable reverse or restore operation.
- State what the learner may change and what relationship or quality they need to preserve or examine. Show the consequence without revealing the decision an independent task is meant to test. Worked demonstrations and requested hints may show more, but count as supported practice.
- A single-choice answer remains editable by choosing another option; it needs no reset before checking. Offer “重新作答” only after an attempt has produced a result, or an explicitly named restore/clear action when it genuinely resets a multi-step construction. Changing a checked answer must invalidate its stale judgment and give a direct route to checking again. Do not clear unrelated work unnecessarily.

Use an evidence route appropriate to the task: preserve the original and revised work, its reason, relevant conditions and actual support. Read learning-evidence.md for numeric constraints and pending human review. Not automatically graded does not mean evidence-free. Do not collapse a construction, a reason and a recognition choice into a shared score. An empty draft can be recorded honestly, but saving it is not task completion; a nonempty reason is still not semantic evidence of correctness.

There is no fixed choice-question count. The recognition page is optional; new-example tasks may remain inside the learning activity as constructions or explanations. Let layout accommodate the material, including an odd final item, instead of adding questions for visual symmetry. Free canvas presentation is the default for 0.5+; learners need not exit to a test page to have meaningful work recorded.

## Budget the actual learning viewport

The tablet viewport is not the canvas budget. At 1000×600 CSS px, the standalone header and collapsed footer can leave only about 400–470px for the learning area; exact height depends on title wrapping, fonts and footer state. Use the supplied context/viewport height and inspect the built host, not only a canvas opened on its own. An authoring assumption of 600px of canvas height can push the primary operation below the fold.

Keep the main learning object, its essential controls and current feedback accessible within that allocation where practical. Reorganize or progressively disclose secondary help; allow deliberate scrolling for longer explanations rather than shrinking touch targets or clipping core content. Test both closed and expanded help, feedback after an error, view switching and round-trip resizing. A compact-height branch can help, but choose it from the content's available allocation rather than prescribing a universal 437px or 700px limit. Avoid a height-feedback loop by deriving layout from the host's stable viewport message, not the iframe's own growing document height. Contract.md defines the message.

## Let the player supply formal-check judgments

Every judged response must begin with an immediately readable verdict on its own line, then a short response-specific reason and a useful next move. For choices, use “答对了” / “还没答对”; for numeric constructions, scope the verdict to the declared numerical requirements, never the ungraded explanation. Invalid input is “还不能判断”, a save failure is “未保存”, and an open explanation is “待人工复核”, not a fabricated right/wrong answer. This also applies to canvas-authored feedback, whose wording the author must implement and review. Editing a response invalidates the old verdict immediately. Longer explanation may be disclosed separately.

In content.test, explanation and optionFeedback should explain the response with evidence and a useful next move. The standalone player adds the correctness status itself. Start directly with the reason, such as “Tom 指一个人，play 在这里变成 plays…”, rather than “对。…” or “回答正确。…”. The same applies to incorrect-option explanations: explain the selected error rather than repeating “错。…”. Canvas-authored feedback controls its own wording and is separate from these formal-check fields.

## Check subject matter and representations

Apply the subject guide selected through SKILL.md for domain-specific correctness, representations, acceptable answers and evaluation limits. Shared constraints are: derive labels and judgments from the actual learning object, distinguish observed evidence from interpretation, and avoid claiming outcomes the interaction does not examine.

Name only materials actually supplied or inspected. Without an inspected textbook, describe the lesson as original supplementary material. Do not invent pages, curriculum alignment, professional endorsement or learning-effect evidence.

## Review the completed artifact

Independently recompute answers and inspect implemented interactions rather than trusting variables named correct or expected. Review every option's explanation and exercise distinct plausible wrong choices where available, as well as a correct answer. Check actual coverage and progression against the private learningDesign. New-example questions should examine the intended relationship and relevant borderline cases; changed names or numbers alone establish only near transfer. A working page, valid option arrays or high score is not evidence of adequate topic training.

Trace the full interaction before accepting it: before selection → selected → changed before checking → checked → changed after checking → checked again; include restore/retry only where it has meaning. Verify that labels predict effects, instructional evidence updates at selection time, old feedback does not describe a new choice, and no second confirmation is needed to perform the same check. Test the action path and its wording as well as the final answer. These semantic checks need agent review; a generic phrase blacklist cannot establish their quality.

For each interaction pattern, inspect the visible instruction and controls before acting, then compare the expected effect with the actual effect, including reversal where relevant. Visible labels, accessible names, states and consequences must agree. Functional success alone does not establish understandable interaction. If an existing rule was violated, correct execution rather than adding a ban on a common word or mandating one visual design.

Use concise, content-specific feedback. A local score reports performance on these questions only. Free text does not become correct merely because it is nonempty. Learners may revisit, switch or stop; unrelated activities must not be hidden behind an unverified diagnosis or a perfect-score gate.

Review four things separately and report their actual status:

1. Artifact structure and script syntax.
2. Real browser operation, accessible controls and the intended viewports.
3. Subject-matter consistency, including diagrams and explanations.
4. Learning effectiveness, which requires actual learner observation and is not established by the first three checks.
