const dimensions = ['static', 'browser', 'subject', 'learnerEffectiveness'];
export function reviewScaffold(validation) {
  return {
    format: 'interactive-topic-lesson.review.v1', artifactSha256: validation.artifactSha256,
    checks: Object.fromEntries(dimensions.map(name => [name, {
      status: name === 'static' ? (validation.ok ? 'passed' : 'failed') : 'not_run',
      evidence: name === 'static' ? ['validateLesson: structure, references and classic-script syntax only'] : [],
    }])),
  };
}

export function validateReview(report, validation) {
  if (report?.format !== 'interactive-topic-lesson.review.v1' || report.artifactSha256 !== validation.artifactSha256) throw new Error('Review must match this artifact digest and report format');
  for (const name of dimensions) {
    const check = report.checks?.[name];
    if (!check || !['passed', 'failed', 'not_run'].includes(check.status) || !Array.isArray(check.evidence) || check.evidence.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`Invalid review check: ${name}`);
    if (check.status !== 'not_run' && check.evidence.length === 0) throw new Error(`Review ${name} requires actual evidence`);
  }
  if (report.checks.static.status !== (validation.ok ? 'passed' : 'failed')) throw new Error('Static review must agree with validation');
  return report;
}

export function publicReview(report) {
  return Object.fromEntries(dimensions.map(name => [name, report.checks[name].status]));
}
