/**
 * @typedef {import('@commitlint/types').RuleOutcome} RuleOutcome
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'wip',
        'hotfix',
        'release',
      ],
    ],
    'scope-enum': [0],
    'scope-case': [2, 'always', ['lower-case', 'kebab-case']],
    'scope-empty': [0],
    'subject-case': [2, 'never', ['pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 120],
    'header-min-length': [2, 'always', 10],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
    'header-case': [0],
  },
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w+)(?:\(([^)]+)\))?\s*:\s*(?:\[([^\]]+)]\s*)?(.+)$/,
      headerCorrespondence: ['type', 'scope', 'ticket', 'subject'],
      noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
      revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w+)/i,
      revertCorrespondence: ['header', 'hash'],
    },
  },
  plugins: [
    {
      rules: {
        /**
         * Ensure optional ticket references follow PREFIX-123 format.
         * @param {{ticket?: string}} parsed
         * @returns {RuleOutcome}
         */
        'task-code-format': function taskCodeFormat(parsed) {
          const { ticket } = parsed;
          if (!ticket) {
            return [true];
          }

          const taskCodeRegex = /^[A-Z]{2,10}-\d+$/;
          if (!taskCodeRegex.test(ticket)) {
            return [false, 'Task code must be in format [PREFIX-NUMBER] (e.g., [DEV-123])'];
          }

          return [true];
        },
        /**
         * Allow lowercase/kebab-case scopes while keeping guidance in place.
         * @param {{scope?: string}} parsed
         * @returns {RuleOutcome}
         */
        'flexible-scope': function flexibleScope(parsed) {
          const { scope } = parsed;
          if (!scope) {
            return [true];
          }

          const scopeRegex = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
          if (!scopeRegex.test(scope)) {
            return [false, 'Scope must be lowercase and can contain hyphens'];
          }

          return [true];
        },
      },
    },
  ],
  helpUrl: 'https://github.com/boostpack/create-library/blob/main/docs/COMMIT_CONVENTIONS.md',
};
