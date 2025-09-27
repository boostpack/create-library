# 🚀 Detailed Setup Guide

This guide will help you set up your new TypeScript library from this template.

## Prerequisites

- Node.js 22+ (Latest LTS)
- npm 10+
- GitHub account
- npm account (for publishing)

## Step 1: Create Your Repository

### Option A: Use GitHub Template (Recommended)

1. Go to [boostpack/typescript-library-starter](https://github.com/boostpack/typescript-library-starter)
2. Click the green **"Use this template"** button
3. Choose a name for your repository
4. Select public or private
5. Click **"Create repository from template"**

### Option B: Fork and Clone

```bash
# Clone the template
git clone https://github.com/boostpack/typescript-library-starter.git my-library
cd my-library

# Remove original git history
rm -rf .git

# Initialize new repository
git init
git add .
git commit -m "chore: initial commit from template"

# Add your remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 2: Configure GitHub Repository

### Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Click **Save**

### Add Repository Secrets

Navigate to **Settings** → **Secrets and variables** → **Actions** and add:

#### 1. NPM_TOKEN (Required for npm publishing)

1. Go to [npmjs.com](https://www.npmjs.com/) and sign in
2. Click your profile icon → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select **Automation**
5. Copy the token
6. Add it as `NPM_TOKEN` secret in GitHub

#### 2. CODECOV_TOKEN (Required for coverage reports)

1. Go to [codecov.io](https://app.codecov.io/gh) and sign in with GitHub
2. Add your repository
3. Copy the repository token
4. Add it as `CODECOV_TOKEN` secret in GitHub

### Configure Branch Protection (Optional but Recommended)

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Check:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
5. Select these status checks:
   - `lint`
   - `test`
   - `build`

## Step 3: Update Package Information

### 1. Update package.json

```json
{
  "name": "@your-scope/your-library",
  "version": "0.0.0",
  "description": "Your awesome library description",
  "keywords": ["your", "keywords", "here"],
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/YOUR_REPO.git"
  },
  "homepage": "https://github.com/YOUR_USERNAME/YOUR_REPO#readme",
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/issues"
  }
}
```

### 2. Update LICENSE

Replace `Timur Popov` with your name in the LICENSE file.

### 3. Update Repository Topics

On your GitHub repository page, click the gear icon next to **About** and add relevant topics:
- `typescript`
- `library`
- `npm-package`
- Your specific domain tags

## Step 4: Set Up Development Environment

### Install Dependencies

```bash
# Use correct Node version (if you have nvm)
nvm use

# Install dependencies
npm install
```

### Initialize Git Hooks

```bash
npm run prepare
```

This sets up Husky for commit message validation.

## Step 5: Start Development

### Replace Example Code

1. Edit `src/index.ts` with your library code
2. Update `test/` with your tests
3. Update examples in `examples/` directory

### Development Commands

```bash
# Watch mode - rebuilds on file changes
npm run dev

# Run tests in watch mode
npm run test:watch

# Check code quality
npm run lint
npm run typecheck

# Build the library
npm run build

# Generate documentation
npm run docs
```

## Step 6: Configure npm Publishing

### Set npm Scope (if using scoped package)

```bash
# Set your npm organization
npm config set @YOUR_SCOPE:registry https://registry.npmjs.org/

# Login to npm
npm login
```

### Test Publishing Locally

```bash
# Build the library
npm run build

# Test package locally
npm pack

# Check what will be published
npm publish --dry-run
```

## Step 7: Your First Release

### Automatic Release (Recommended)

1. Make your changes
2. Commit using conventional commits:
   ```bash
   git commit -m "feat: my awesome feature"
   ```
3. Push to main:
   ```bash
   git push origin main
   ```
4. GitHub Actions will automatically:
   - Run tests
   - Build the library
   - Bump version based on commits
   - Publish to npm
   - Create GitHub release
   - Generate changelog

### Manual Release

If you prefer manual control:

```bash
# Build
npm run build

# Bump version
npm version patch|minor|major

# Publish
npm publish

# Push tags
git push --follow-tags
```

## Environment Variables Summary

### Required GitHub Secrets

| Secret | Required | Description | How to Get |
|--------|----------|-------------|------------|
| `NPM_TOKEN` | Yes | npm automation token | [npmjs.com/settings/~/tokens](https://www.npmjs.com/settings/~/tokens) |
| `CODECOV_TOKEN` | Yes* | Codecov token | [app.codecov.io](https://app.codecov.io/gh) |
| `GITHUB_TOKEN` | Auto | GitHub token | Automatically provided by GitHub |

*Required only if you want coverage reports

### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_VERSION` | Node.js version for CI | 22 (from .nvmrc) |

## Troubleshooting

### npm Publishing Fails

- Check `NPM_TOKEN` is correctly set in GitHub Secrets
- Verify package name is available: `npm view @your-scope/your-package`
- Ensure you have publish rights to the scope

### Coverage Reports Not Showing

- Verify `CODECOV_TOKEN` is set
- Check repository is added to Codecov
- Wait for first successful CI run

### Documentation Not Deploying

- Ensure GitHub Pages is enabled
- Check source is set to "GitHub Actions"
- Verify docs workflow is passing

### Semantic Release Not Working

- Ensure commits follow conventional format
- Check branch names match `release.config.js` configuration
- Verify `NPM_TOKEN` has publish permissions

## Next Steps

1. ⭐ Star the [original template](https://github.com/boostpack/typescript-library-starter)
2. 📖 Read about [Conventional Commits](https://www.conventionalcommits.org/)
3. 🚀 Learn about [Semantic Release](https://semantic-release.gitbook.io/)
4. 📊 Set up [Codecov Dashboard](https://app.codecov.io/)
5. 📦 Configure [npm Organization](https://www.npmjs.com/org/create)

## Support

- Create an issue in your repository
- Check [template repository issues](https://github.com/boostpack/typescript-library-starter/issues)

---

Happy coding! 🎉