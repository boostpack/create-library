# GitHub Actions Pinned Versions

This document tracks the specific versions of GitHub Actions used in this project for stability and security.

## Current Pinned Versions

| Action | Version | Purpose | Last Updated |
|--------|---------|---------|--------------|
| `actions/checkout` | `v4.1.1` | Repository checkout | 2024-01-15 |
| `actions/setup-node` | `v4.0.1` | Node.js setup | 2024-01-15 |
| `codecov/codecov-action` | `v3.1.4` | Code coverage upload | 2024-01-15 |
| `actions/upload-artifact` | `v3.1.3` | Build artifacts upload | 2024-01-15 |
| `actions/configure-pages` | `v4.0.0` | GitHub Pages setup | 2024-01-15 |
| `actions/upload-pages-artifact` | `v3.0.1` | Pages artifact upload | 2024-01-15 |
| `actions/deploy-pages` | `v4.0.4` | Pages deployment | 2024-01-15 |
| `andresz1/size-limit-action` | `v1.7.0` | Bundle size checking | 2024-01-15 |

## Why Pin Versions?

### Security
- Prevents supply chain attacks through malicious updates
- Ensures reproducible builds across all environments
- Allows for controlled updates with security review

### Stability
- Prevents breaking changes from affecting CI/CD
- Ensures consistent behavior across different runs
- Reduces "works on my machine" issues

### Compliance
- Makes builds reproducible for audit purposes
- Provides clear dependency tracking
- Enables rollback to known working versions

## Update Strategy

### Monthly Review
1. Check for new versions of pinned actions
2. Review release notes for security fixes
3. Test updates in a separate branch
4. Update this documentation with new versions

### Security Updates
- Security patches are applied immediately
- Critical vulnerabilities trigger emergency updates
- All security updates are tested before deployment

### Breaking Changes
- Major version updates require thorough testing
- Breaking changes are batched into planned updates
- Rollback plan is prepared before applying updates

## How to Update

### 1. Check Current Versions
```bash
# List all actions in workflows
grep -r "uses:" .github/workflows/
```

### 2. Find Latest Versions
Visit the action's GitHub repository or use:
```bash
# Example for actions/checkout
curl -s https://api.github.com/repos/actions/checkout/releases/latest | jq -r .tag_name
```

### 3. Test Updates
```bash
# Create test branch
git checkout -b update-actions

# Update versions in workflows
# Test in CI/CD pipeline
# Verify all jobs pass
```

### 4. Apply Updates
```bash
# Update this documentation
# Create PR with changes
# Merge after review and testing
```

## Monitoring

### Dependabot Configuration
The project uses Dependabot to monitor action updates:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
    open-pull-requests-limit: 5
```

### Security Alerts
- GitHub Security Advisories are monitored
- Action repositories are watched for security updates
- Team notifications are set up for critical updates

## Emergency Procedures

### Compromised Action
1. Immediately pin to last known safe version
2. Update all workflows using the action
3. Create hotfix branch and emergency PR
4. Deploy fix to all environments

### CI/CD Failure
1. Check action version compatibility
2. Rollback to previous working versions
3. Create incident report
4. Plan systematic update approach

## Best Practices

### Action Selection
- Use official GitHub actions when possible
- Verify action maintainer reputation
- Check action source code before use
- Prefer actions with frequent updates

### Version Pinning
- Always pin to specific version (not latest)
- Use semantic version tags (v1.2.3)
- Avoid branch-based versions (main, master)
- Update regularly but systematically

### Documentation
- Keep this file updated with changes
- Document reason for each update
- Track security-related updates separately
- Maintain rollback procedures

## Useful Commands

### Check Action Usage
```bash
# Find all actions used
find .github/workflows -name "*.yml" -exec grep -l "uses:" {} \;

# List unique actions
grep -r "uses:" .github/workflows/ | cut -d: -f3 | sort -u
```

### Validate Workflows
```bash
# Install act for local testing
# brew install act

# Test workflow locally
act -W .github/workflows/ci.yml
```

### Security Scanning
```bash
# Check for known vulnerabilities
npm audit

# Scan action dependencies
gh api repos/{owner}/{repo}/security-advisories
```

## Resources

- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Action Versioning](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)