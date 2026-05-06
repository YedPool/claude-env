# GitHub CLI authentication

The author's `gh` is logged in to `github.com` with these token scopes:

- `gist`
- `read:org`
- `repo`
- `workflow`

Token is stored in the OS keyring (Windows Credential Manager), not in
a plaintext config file.

## Authenticate on a fresh machine

```powershell
gh auth login
```

Walk through the prompts:

| Prompt | Pick |
|--------|------|
| What account do you want to log into? | **GitHub.com** |
| What is your preferred protocol for Git operations? | **HTTPS** (matches the credential helper config) |
| Authenticate Git with your GitHub credentials? | **Yes** |
| How would you like to authenticate GitHub CLI? | **Login with a web browser** (preferred) — gives you a one-time code, opens GitHub in your browser, you paste the code. The token is then stored in the OS keyring. |

If you opt for **paste an authentication token** instead: generate a
fine-grained PAT at https://github.com/settings/tokens with at minimum
`repo`, `workflow`, `read:org`, `gist` scopes. Paste it. Then revoke
the token from GitHub once you confirm `gh auth status` shows you
logged in.

## Verify

```powershell
gh auth status
```

Should print:

```
github.com
  ✓ Logged in to github.com account <YOU> (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'
```

## Why scopes matter

- `repo` — clone/push private repos.
- `workflow` — required to push changes that modify
  `.github/workflows/*.yml`. Without it, `gh pr create` fails when the
  branch touches workflow files.
- `read:org` — needed for org-scoped commands (`gh org list`,
  `gh issue list --search org:foo`).
- `gist` — `gh gist create`.

If you skip `workflow`, you'll hit a confusing 403 the first time you
push a workflow change. Better to include it up front.
