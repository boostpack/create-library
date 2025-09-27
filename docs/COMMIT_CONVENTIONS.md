# Commit Message Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/) with additional flexibility for various team workflows.

## Format

```
<type>[optional scope]: [optional task] <description>

[optional body]

[optional footer(s)]
```

## Supported Formats

### Basic Format
```
feat: add user authentication
fix: resolve memory leak in cache
docs: update API documentation
```

### With Scope
```
feat(auth): add OAuth2 support
fix(api): handle edge case in validation
docs(readme): add installation instructions
```

### With Task Code
```
feat: [DEV-123] implement user dashboard
fix: [BUG-456] resolve login timeout issue
docs: [TASK-789] update deployment guide
```

### Combined (Scope + Task Code)
```
feat(auth): [DEV-123] implement OAuth2 login
fix(api): [BUG-456] handle rate limiting
docs(readme): [DOC-789] add examples section
```

## Types

| Type | Description | Release |
|------|-------------|---------|
| `feat` | New feature | Minor |
| `fix` | Bug fix | Patch |
| `docs` | Documentation only | No release* |
| `style` | Code style changes | Patch |
| `refactor` | Code refactoring | Patch |
| `perf` | Performance improvements | Patch |
| `test` | Adding tests | No release |
| `build` | Build system changes | No release |
| `ci` | CI configuration changes | No release |
| `chore` | Maintenance tasks | No release |
| `revert` | Revert previous commit | Patch |
| `wip` | Work in progress | No release |
| `hotfix` | Critical production fix | Patch |
| `release` | Release preparation | No release |

*Some documentation changes may trigger releases

## Scopes

Scopes are optional and can be any lowercase identifier with hyphens:

- `auth` - Authentication related
- `api` - API changes
- `ui` - User interface
- `database` - Database related
- `user-profile` - User profile features
- `payment-gateway` - Payment integration
- `admin-panel` - Admin functionality

## Task Codes

Task codes are optional and should follow the format `[PREFIX-NUMBER]`:

- `[DEV-123]` - Development task
- `[BUG-456]` - Bug report
- `[FEAT-789]` - Feature request
- `[TASK-012]` - General task
- `[HOTFIX-345]` - Critical fix
- `[EPIC-678]` - Epic/large feature

## Breaking Changes

For breaking changes, add `!` after the type/scope or include `BREAKING CHANGE:` in the footer:

```
feat!: change API response format

BREAKING CHANGE: The user API now returns different field names
```

```
feat(api)!: update authentication flow
```

## Examples

### Simple commits
```
feat: add search functionality
fix: resolve pagination bug
docs: update README
```

### With scope
```
feat(auth): implement 2FA
fix(payment): handle failed transactions
style(ui): update button colors
```

### With task codes
```
feat: [DEV-123] add user preferences
fix: [BUG-456] resolve login redirect
docs: [DOC-789] add API examples
```

### Complex commits
```
feat(user-profile): [FEAT-123] add avatar upload

- Implement file upload validation
- Add image resizing functionality
- Update user model schema

Closes #123
```

### Breaking changes
```
feat(api)!: [FEAT-456] restructure user endpoints

BREAKING CHANGE: User API endpoints have been reorganized.
/api/user/profile is now /api/users/me/profile
```

## Validation Rules

1. **Type**: Must be one of the allowed types
2. **Scope**: Optional, lowercase with hyphens allowed
3. **Task Code**: Optional, format `[PREFIX-NUMBER]`
4. **Subject**: Required, no period at the end
5. **Length**: Header max 120 characters, min 10 characters
6. **Case**: Subject should be lowercase (except proper nouns)

## Release Channels

Different branches trigger different release channels:

- `main`/`master` → stable releases (1.0.0)
- `next` → next releases (1.0.0-next.1)
- `beta` → beta releases (1.0.0-beta.1)
- `alpha` → alpha releases (1.0.0-alpha.1)
- `N.x` → maintenance releases (1.x.x)
- `N.N.x` → patch releases (1.1.x)

## Tips

1. Use present tense ("add" not "added")
2. Use imperative mood ("move cursor to..." not "moves cursor to...")
3. Don't capitalize the first letter of the subject
4. No period (.) at the end of the subject
5. Include motivation for the change and contrast with previous behavior

## Tools

This project uses:
- **commitlint** - Validates commit message format
- **semantic-release** - Automatic versioning and releases
- **husky** - Git hooks for validation