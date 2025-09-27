module.exports = {
  branches: [
    'main',
    'master',
    { name: 'next', prerelease: true, channel: 'next' },
    { name: 'next-major', prerelease: true, channel: 'next-major' },
    { name: 'alpha', prerelease: true, channel: 'alpha' },
    { name: 'beta', prerelease: true, channel: 'beta' },
    { name: '+([0-9])?(.{+([0-9]),x}).x', prerelease: false, channel: "${name.replace(/\\.x$/g, '')}" },
    { name: '+([0-9]).x', prerelease: false, channel: "${name.replace(/\\.x$/g, '')}.x" },
  ],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { type: 'docs', scope: 'README', release: 'patch' },
          { type: 'refactor', release: 'patch' },
          { type: 'style', release: 'patch' },
          { type: 'perf', release: 'patch' },
          { scope: 'no-release', release: false },
        ],
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
        },
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: '✨ Features' },
            { type: 'fix', section: '🐛 Bug Fixes' },
            { type: 'perf', section: '⚡ Performance Improvements' },
            { type: 'revert', section: '⏪ Reverts' },
            { type: 'docs', section: '📝 Documentation', hidden: false },
            { type: 'style', section: '💄 Styles', hidden: false },
            { type: 'refactor', section: '♻️ Code Refactoring', hidden: false },
            { type: 'test', section: '✅ Tests', hidden: false },
            { type: 'build', section: '🔧 Build System', hidden: false },
            { type: 'ci', section: '👷 CI/CD', hidden: false },
            { type: 'chore', section: '🏗️ Chores', hidden: false },
          ],
        },
      },
    ],
    '@semantic-release/changelog',
    '@semantic-release/npm',
    [
      '@semantic-release/github',
      {
        successComment: false,
        failComment: false,
        releasedLabels: ["released${nextRelease.channel ? ` on @${nextRelease.channel}` : ''} from ${branch.name}"],
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};
