module.exports = {
  $schema: 'https://docs.renovatebot.com/renovate-schema.json',
  extends: [
    'config:base',
    ':dependencyDashboard',
    ':semanticCommits',
    ':separatePatchReleases',
    'group:monorepos',
    'group:recommended',
    'replacements:all',
    'workarounds:all',
  ],
  schedule: ['before 10am'],
  labels: ['dependencies'],
  prHourlyLimit: 2,
  prConcurrentLimit: 10,
  commitMessagePrefix: 'chore(deps):',
  commitMessageAction: 'update',
  packageRules: [
    {
      groupName: 'Development dependencies',
      depTypes: ['devDependencies'],
      schedule: ['before 10am'],
    },
    {
      groupName: 'Production dependencies',
      depTypes: ['dependencies'],
      schedule: ['before 10am'],
    },
    {
      groupName: 'GitHub Actions',
      managers: ['github-actions'],
      schedule: ['before 10am on the first day of the month'],
    },
    {
      groupName: 'TypeScript ecosystem',
      packagePatterns: ['^@types/', '^@typescript-eslint/', 'typescript', 'ts-jest', 'tslib'],
    },
    {
      groupName: 'ESLint ecosystem',
      packagePatterns: ['eslint', '^eslint-'],
    },
    {
      groupName: 'Jest ecosystem',
      packagePatterns: ['jest', '^@jest/', '^jest-'],
    },
    {
      groupName: 'Rollup ecosystem',
      packagePatterns: ['rollup', '^@rollup/', '^rollup-'],
    },
  ],
  vulnerabilityAlerts: {
    enabled: true,
  },
  osvVulnerabilityAlerts: true,
  lockFileMaintenance: {
    enabled: true,
    schedule: ['before 10am'],
  },
};
