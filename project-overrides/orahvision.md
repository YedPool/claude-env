# Orahvision project override

Rules that apply *only* when working in the Orahvision repo (Windows
desktop reader app for low-vision users — PyQt6 + a C# CZUR bridge,
ships through alpha/beta/stable channels). These rules are
deliberately **not** in the global `CLAUDE.md`; paste them into the
Orahvision repo's `CLAUDE.md` instead.

## Release framework — branch naming controls backports

Orahvision uses an alpha/beta/stable release framework. Branch naming
controls backport behavior:

- `fix/*` and `hotfix/*` are automatically cherry-picked to the last 2
  `release/beta-*` and last 2 `release/stable-*` branches by
  `.github/workflows/cherry-pick-fixes.yml`.
- `feature/*`, `chore/*`, and `docs/*` stay on master only.

When creating a branch for a bug that users on deployed devices should
receive, it MUST start with `fix/` or `hotfix/` — otherwise the fix
will never reach them. See the repo's `CLAUDE.md` "Release Framework"
section for the full flow.

## Linting

- The project linter is `flake8`. Before committing, run flake8 over
  the entire codebase and confirm there are no critical errors.

## i18n — all user-facing strings go through translate()

In Orahvision, always build out user-facing buttons, text, dialogs,
toasts, etc. using parameterized text that pulls the appropriate text
for the language setting from the appropriate language file in the
`reader/i18n/` folder, using the existing pattern in the rest of the
program.

Also make sure you add the correct text and translations to all of the
language files when you add buttons, toasts, or dialogs. The supported
languages are stored as two-letter codes (`en`, `es`, `he`).

Usage: `translate(lang, "string_key")`.

## Voiceover audio

Whenever committing, check that any new buttons have the proper setup
for the voiceover audio code to play. Also check that the actual audio
file exists at `reader/i18n/<lang>/voiceovers/<key>.mp3`.

The voiceover generator tool lives at `tools/voiceover_generator.py`.
It uses Google Gemini 2.5 Pro TTS (Kore voice). The API key is stored
in the Windows keyring under service `orahvision`, key
`google_api_key`.

## C# CZUR bridge

When compiling any C# script in this project, follow the instructions
at `C:\Users\yedid\Documents\Code\building-csharp-instructions.txt`.
The C# bridge source is at `reader/camera_interface/czur_bridge_source/`
and consists of a TCP server that talks to the CZUR ActiveX SDK.

## File-organization conventions

- Planning documents live in `planning/`.
- Test and debug scripts live in `test_debug/`.
- Both must be checked at commit time — nothing should be loose at the
  repo root.
