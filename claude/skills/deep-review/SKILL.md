---
name: deep-review
description: "Invoke for a comprehensive deep-dive code review across three dimensions:
  Security (full threat analysis), Optimization (dead code, duplication, performance),
  and Traceability (end-to-end call chain verification from UI to database and back).
  Use when a feature is complete and needs rigorous review before committing or creating a PR."
---

# Deep Review

Perform a thorough, multi-dimensional code review using parallel sub-agents. This is not a surface-level review -- treat the code as if a junior developer wrote it and your best senior engineers are now auditing it.

## How To Run

When this skill is invoked, you will receive ARGUMENTS telling you what to review. The arguments should specify either:
- A set of changed files (e.g., from a branch diff)
- A feature name / area of code to review
- A directory or set of directories to analyze

If no arguments are provided, ask the user what code to review.

---

## Phase 1: Launch Sub-Agents (Parallel)

Launch ALL of the following sub-agents in parallel using the Task tool. Each sub-agent should be given the full list of files/directories to review and clear instructions.

### Sub-Agent 1: Security Analysis

**Prompt template:**
```
You are a senior security engineer performing a full security audit.

FILES TO REVIEW:
{file_list}

CONTEXT:
{feature_description}

Perform a COMPLETE security analysis. Treat the code as if written by a junior developer. Look for EVERY possible issue, no matter how small. Be thorough, not diplomatic.

CHECK FOR:
- Input validation gaps: Are ALL inputs validated? Every parameter, every field, every query string, every header?
- Injection vulnerabilities: SQL/NoSQL injection, command injection, LDAP injection, XSS (stored, reflected, DOM-based)
- Authentication weaknesses: Missing auth checks, token handling issues, session management flaws, credential exposure
- Authorization gaps: Missing permission checks, privilege escalation paths, IDOR (insecure direct object references)
- Secrets exposure: Hardcoded secrets, API keys in code/config, secrets in logs or error messages
- Data exposure: Sensitive data in responses, verbose error messages leaking internals, PII handling
- Race conditions: TOCTOU (time-of-check-time-of-use) bugs, non-atomic operations that should be atomic
- Cryptographic issues: Weak algorithms, improper key management, missing encryption at rest/in transit
- Dependency risks: Known vulnerable packages, unpinned versions, unnecessary dependencies
- API security: Missing rate limiting, CORS misconfiguration, missing security headers, HTTP method restrictions
- Error handling: Swallowed exceptions hiding bugs, error messages exposing internals, missing error handling on critical paths
- DynamoDB / database: Missing input sanitization for queries, overly broad scan operations, missing condition expressions on writes

For EACH issue found, provide:
1. Severity: CRITICAL / HIGH / MEDIUM / LOW
2. File and line number(s)
3. What the vulnerability is (plain English)
4. Why it matters (what could an attacker do?)
5. Recommended fix (specific code suggestion)

Sort findings by severity (critical first). If no issues found in a category, explicitly state "No issues found" so we know you checked.
```

### Sub-Agent 2: Optimization Analysis

**Prompt template:**
```
You are a senior software architect performing a full code optimization review.

FILES TO REVIEW:
{file_list}

CONTEXT:
{feature_description}

Perform a COMPLETE optimization analysis. Look at every function, every class, every module.

CHECK FOR:

DEAD CODE:
- Functions/methods that are never called from anywhere in the codebase
- Imports that are unused
- Variables assigned but never read
- Code paths that can never be reached
- Commented-out code that should be deleted

DUPLICATION:
- Functions or logic blocks that are duplicated across files
- Similar patterns that could share a common utility
- Copy-pasted error handling that should be centralized
- Repeated string literals or magic numbers that should be constants

CODE QUALITY:
- Functions that are too long (doing too many things)
- Functions that are too short (unnecessary abstractions adding indirection without value)
- Deep nesting that could be flattened with early returns
- Complex conditionals that could be simplified
- Poor naming that obscures intent

PERFORMANCE:
- Unnecessary API calls or database queries
- N+1 query patterns
- Missing caching opportunities for expensive operations
- Blocking operations that should be async
- Excessive memory allocation (large string concatenation in loops, etc.)
- UI operations that could cause freezing (long operations on main thread)

ARCHITECTURE:
- Violations of separation of concerns
- Tight coupling between modules that should be independent
- Missing error boundaries
- Functions with too many responsibilities

For EACH finding, provide:
1. Category: DEAD_CODE / DUPLICATION / CODE_QUALITY / PERFORMANCE / ARCHITECTURE
2. Impact: HIGH / MEDIUM / LOW
3. File and line number(s)
4. What the issue is (plain English)
5. Recommended improvement (specific suggestion)
```

### Sub-Agents 3-N: Traceability Analysis (One Per Layer)

Launch ONE sub-agent per architectural layer. The layers depend on the project, but for a typical full-stack app with UI -> Client Logic -> API Client -> API Gateway -> Database, launch one agent per layer boundary.

**Identify layers by reading the project's CLAUDE.md and the code structure.** Common layers:

1. **UI Layer**: Buttons, links, form submissions in the UI (e.g., PyQt6 widgets, HTML/React components)
2. **Dialog/Handler Layer**: Functions that handle UI events and orchestrate business logic
3. **API Client Layer**: Functions that make HTTP calls to the backend
4. **API Gateway/Route Layer**: Lambda handlers, Express routes, Django views that receive requests
5. **Database Layer**: Functions that read/write to the database

**For each layer boundary, the sub-agent prompt should be:**
```
You are a senior QA engineer verifying end-to-end call chain correctness.

LAYER: {layer_name} -> {next_layer_name}
FILES IN THIS LAYER: {files}
FILES IN NEXT LAYER: {next_layer_files}

CONTEXT:
{feature_description}

For EVERY call that crosses from {layer_name} to {next_layer_name}, verify:

1. EXISTENCE: Does the called function/endpoint actually exist?
2. NAMING: Is the function/endpoint name spelled correctly? Does it match exactly?
3. ARGUMENTS: Are all required arguments passed? Are argument names correct? Are argument types correct?
4. RETURN VALUES: Does the caller handle the return value correctly? Does it handle all possible return shapes (success, error, null)?
5. ERROR HANDLING: Does the caller handle all error cases the callee can produce? Are error codes/types matched correctly?
6. DATA FLOW: Does data flow correctly from one layer to the next? Are field names consistent (no camelCase vs snake_case mismatches, no typos in dict keys)?
7. HTTP DETAILS (if applicable): Correct HTTP method (GET/POST/PUT/DELETE)? Correct URL path? Correct Content-Type? Correct status codes handled?

FORMAT your findings as a table:

| Caller (file:line) | Callee (file:function) | Status | Issue (if any) |
|---------------------|------------------------|--------|----------------|

Status should be: OK, WARNING, or BROKEN

For any WARNING or BROKEN items, provide:
- What is wrong (plain English)
- What the fix should be
- How confident you are (certain / likely / possible)
```

---

## Phase 2: Collect Results

Wait for ALL sub-agents to complete. Read each result carefully.

---

## Phase 3: Generate Unified Report

Combine all findings into a single, well-structured report. Save it to the project's `planning/` directory as `deep-review-{feature-name}.md`.

### Report Structure:

```markdown
# Deep Review: {Feature Name}
**Date:** {date}
**Branch:** {branch}
**Files Reviewed:** {count}

---

## Executive Summary
{2-3 sentences: overall health, most critical findings, recommendation}

---

## Security Findings

### Critical
{items}

### High
{items}

### Medium
{items}

### Low
{items}

---

## Optimization Findings

### Dead Code
{items}

### Duplication
{items}

### Code Quality
{items}

### Performance
{items}

### Architecture
{items}

---

## Traceability Findings

### Call Chain: UI -> Handler
{table}

### Call Chain: Handler -> API Client
{table}

### Call Chain: API Client -> API Gateway
{table}

### Call Chain: API Gateway -> Database
{table}

---

## Action Items

Priority-ordered list of all findings that need to be fixed. Each item should have:
- [ ] **[SEVERITY]** Brief description (file:line) — what to do

Group by:
1. Must fix before merge (Critical/High security, any BROKEN traceability)
2. Should fix before merge (Medium security, WARNING traceability, High optimization)
3. Can fix later (Low security, Medium/Low optimization)
```

---

## Important Notes

- Run all sub-agents in the background to keep the main context clean
- Each sub-agent should READ the actual code files, not guess from memory
- For traceability, each agent must read BOTH sides of the boundary (caller AND callee)
- Be exhaustive -- it is better to flag 50 items with 5 false positives than to miss 1 real bug
- Do NOT soften findings. If something is broken, say "BROKEN" not "could potentially be improved"
- The final report must be actionable -- every finding needs a concrete fix suggestion
- The Action Items section is the most important part -- it drives the fix work
