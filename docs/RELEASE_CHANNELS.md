# Release Channels

This project uses **Semantic Release** with multiple release channels to support different development workflows and environments.

## Supported Branches

### Production Releases

#### `main` / `master`
- **Channel**: `latest` (default)
- **Version**: `1.0.0`, `1.1.0`, `2.0.0`
- **Usage**: Stable production releases
- **npm tag**: `latest`

### Pre-release Channels

#### `next`
- **Channel**: `next`
- **Version**: `1.0.0-next.1`, `1.0.0-next.2`
- **Usage**: Next major/minor features
- **npm tag**: `next`
- **Install**: `npm install package@next`

#### `next-major`
- **Channel**: `next-major`
- **Version**: `2.0.0-next-major.1`
- **Usage**: Breaking changes for next major version
- **npm tag**: `next-major`
- **Install**: `npm install package@next-major`

#### `alpha`
- **Channel**: `alpha`
- **Version**: `1.0.0-alpha.1`, `1.0.0-alpha.2`
- **Usage**: Early testing, unstable features
- **npm tag**: `alpha`
- **Install**: `npm install package@alpha`

#### `beta`
- **Channel**: `beta`
- **Version**: `1.0.0-beta.1`, `1.0.0-beta.2`
- **Usage**: Feature complete, final testing
- **npm tag**: `beta`
- **Install**: `npm install package@beta`

### Maintenance Branches

#### `N.x` (e.g., `1.x`, `2.x`)
- **Channel**: `1.x`, `2.x`
- **Version**: `1.1.0`, `1.2.0` (on `1.x`)
- **Usage**: Minor updates for specific major version
- **npm tag**: `release-1.x`

#### `N.N.x` (e.g., `1.1.x`, `2.3.x`)
- **Channel**: `1.1.x`, `2.3.x`
- **Version**: `1.1.1`, `1.1.2` (on `1.1.x`)
- **Usage**: Patch releases for specific minor version
- **npm tag**: `release-1.1.x`

## Workflow Examples

### Feature Development
```bash
# Create feature branch from main
git checkout main
git checkout -b feature/new-feature

# Make changes and commit
git commit -m "feat: add awesome new feature"

# Create PR to main
# After merge, automatic release on main channel
```

### Pre-release Testing
```bash
# Create next branch for upcoming features
git checkout main
git checkout -b next

# Add features
git commit -m "feat: add experimental feature"
git push origin next

# Releases as 1.0.0-next.1
```

### Bug Fixes for Older Versions
```bash
# Create maintenance branch
git checkout v1.1.0  # specific version tag
git checkout -b 1.1.x

# Fix bug
git commit -m "fix: resolve critical issue"
git push origin 1.1.x

# Releases as 1.1.1 on release-1.1.x channel
```

### Breaking Changes
```bash
# Use next-major for breaking changes
git checkout main
git checkout -b next-major

# Add breaking change
git commit -m "feat!: change API signature"
git push origin next-major

# Releases as 2.0.0-next-major.1
```

## Release Process

### Automatic Releases
1. **Push to release branch** → Triggers GitHub Action
2. **Semantic Release analyzes commits** → Determines version bump
3. **Creates release** → Updates changelog, tags, publishes to npm
4. **GitHub Release** → Created with release notes

### Manual Release (if needed)
```bash
# Install semantic-release CLI
npm install -g semantic-release-cli

# Trigger release for current branch
npx semantic-release
```

## Version Calculation

Based on conventional commits:

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `fix:` | Patch | 1.0.0 → 1.0.1 |
| `feat:` | Minor | 1.0.0 → 1.1.0 |
| `feat!:` or `BREAKING CHANGE:` | Major | 1.0.0 → 2.0.0 |
| `docs:`, `style:`, `refactor:` | Patch | 1.0.0 → 1.0.1 |
| `test:`, `ci:`, `chore:` | No release | - |

## Channel Configuration

The release channels are configured in `release.config.js`:

```javascript
branches: [
  'main',                    // Latest stable
  'master',                  // Alternative main branch
  { name: 'next', prerelease: true, channel: 'next' },
  { name: 'alpha', prerelease: true, channel: 'alpha' },
  { name: 'beta', prerelease: true, channel: 'beta' },
  // Maintenance branches
  { name: '+([0-9]).x', prerelease: false, channel: '${name}' }
]
```

## Best Practices

### Branch Protection
1. **Protect main/master** - Require PR reviews
2. **Require status checks** - CI must pass
3. **No direct pushes** - Use PRs only
4. **Delete merged branches** - Keep repository clean

### Release Strategy
1. **Use main for stable releases**
2. **Use next for upcoming features**
3. **Use alpha/beta for testing**
4. **Create maintenance branches for LTS**

### Commit Strategy
1. **Follow conventional commits**
2. **Include issue/task references**
3. **Write descriptive commit messages**
4. **Squash PRs for clean history**

## Troubleshooting

### Release Not Created
- Check commit messages follow conventional format
- Ensure branch is configured in `release.config.js`
- Verify GitHub/NPM tokens are valid
- Check CI logs for errors

### Wrong Version Bumped
- Review commit types in PR
- Check for `BREAKING CHANGE:` in commit body
- Verify no `!` after type for breaking changes

### Multiple Releases
- Each channel releases independently
- Use branch protection to prevent conflicts
- Monitor npm tags to avoid confusion

## Monitoring

### GitHub Releases
- Check [releases page](../../releases) for all versions
- Each channel creates separate releases
- Release notes are auto-generated

### NPM Registry
```bash
# Check all available versions
npm view package-name versions --json

# Check specific channel
npm view package-name dist-tags
```