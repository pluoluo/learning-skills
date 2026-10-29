# Host integration

Maintain the teaching criteria, portable contract and build tools here. A host consumes a pinned skill version and validates its output independently; it must not copy a second teaching prompt and silently diverge.

The content inside lesson.json and the generated special-study.json follow SpecialStudyContent v2: schemaVersion:2, layout:"canvas", canvas.html and a separate formal test. The learning platform can validate this using its own parser and inspect the objective mapping with its own quality checks. This is content compatibility; it does not establish installed-skill execution, model reliability or a released platform workflow.

The current platform supports editing the JSON of an existing draft. A user with permission can review special-study.json there and save a new draft version, then preview before publishing. Creation/import automation is a host concern; this skill never invents an import endpoint or writes a database.

The platform owns identity, family access, source snapshots, GenerationJob persistence and finite retry budgets, draft/version concurrency, adult review and publication, server-side scoring and Activity/Attempt records. Never trust a standalone score or a canvas message as an authoritative learning record. When adapting a new skill version, test both its structure and the actual sandbox behavior, preserve older published content and retain the version that generated it.

For platform display, load only the canvas in the platform's sandbox. Keep formal answer keys and explanations on the server until submission; send context with question IDs, prompts and options only. Existing special-study messages provide optional sizing, completion, test submission and voice integration. Platform-only services stay optional for the learning operation. Never embed the standalone player's local scoring shell inside the student canvas.
