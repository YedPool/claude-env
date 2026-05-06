# Global git config

The author's `~/.gitconfig` (canonical values, machine-independent
identity stripped):

```ini
[user]
    name  = <YOUR NAME>
    email = <YOUR EMAIL>

[credential]
    helper = manager        # Git Credential Manager - integrates with Windows
                            # credential store + GitHub. Comes with Git for
                            # Windows.

[filter "lfs"]
    clean    = git-lfs clean -- %f
    smudge   = git-lfs smudge -- %f
    process  = git-lfs filter-process
    required = true

[http]
    sslverify = true        # Default. Listed explicitly so corporate
                            # MITM proxies do not silently disable it.
```

## Why each setting

- **`user.name` / `user.email`** — show up in every commit. Use the
  email associated with your GitHub account, otherwise commits will not
  link to your profile.
- **`credential.helper = manager`** — Git Credential Manager (bundled
  with Git for Windows) caches your GitHub PAT in the Windows
  Credential Manager. No more `username:` prompt every push.
- **LFS filters** — required for any repo that uses `git lfs` for
  binary blobs. The Orahvision repo bundles `TeamViewerQS.exe` in LFS,
  so without these filters cloning gets a pointer file, not the binary.
- **`http.sslverify = true`** — explicit to defend against accidental
  disable from corporate MITM proxies.

## Safe-directory entries

The author has two `safe.directory` entries for WezTerm plugins:

```ini
[safe]
    directory = C:\\Users\\yedid\\AppData\\Roaming/wezterm/plugins/...resurrect.wezterm
    directory = C:\\Users\\yedid\\AppData\\Roaming/wezterm/plugins/...wezterm-...
```

These are added automatically by git the first time you use those repos
under WezTerm. If you do not use WezTerm, skip them. The installer
does not write these — they are auto-added on demand.

## Apply

Run [`install-tier-c.ps1`](./install-tier-c.ps1). It prompts for name
+ email if not already set, then runs the equivalent of:

```bash
git config --global user.name  "<your name>"
git config --global user.email "<your email>"
git config --global credential.helper manager
git config --global filter.lfs.clean    "git-lfs clean -- %f"
git config --global filter.lfs.smudge   "git-lfs smudge -- %f"
git config --global filter.lfs.process  "git-lfs filter-process"
git config --global filter.lfs.required true
git config --global http.sslverify true
```
