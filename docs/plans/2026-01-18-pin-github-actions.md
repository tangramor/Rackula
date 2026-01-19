# Pin GitHub Actions to Commit SHAs Implementation Plan

**Goal:** Pin all GitHub Actions in workflow files to full commit SHAs to prevent supply chain attacks.

**Architecture:** Replace version tags (e.g., `@v6`) with pinned commit SHAs (e.g., `@abc123...`) while keeping version comments for readability. This addresses CodeQL alerts #12-21 for `actions/unpinned-tag`.

**Tech Stack:** GitHub Actions YAML workflows

---

## Background

**Security Issue:** Unpinned action tags can be moved by upstream maintainers (maliciously or accidentally), potentially introducing malicious code into workflows. Pinning to commit SHAs ensures immutable, auditable action versions.

**Format:** `owner/action@<sha> # vX.Y.Z`

## SHA Reference Table

| Action                          | Version | Commit SHA                               |
| ------------------------------- | ------- | ---------------------------------------- |
| actions/checkout                | v6      | 8e8c483db84b4bee98b60c0593521ed34d9990e8 |
| actions/checkout                | v4      | 34e114876b0b11c390a56381ad16ebd13914f8d5 |
| actions/setup-node              | v6      | 6044e13b5dc448c55e2357c09f80417699197238 |
| actions/setup-node              | v4      | 49933ea5288caeca8642d1e84afbd3f7d6820020 |
| actions/upload-artifact         | v6      | b7c566a772e6b6bfb58ed0dc250532a479d7789f |
| actions/add-to-project          | v1.0.2  | 244f685bbc3b7adfa8466e08b698b5577571133e |
| actions/github-script           | v8      | ed597411d8f924073f98dfc5c65a23a2325f34cd |
| docker/setup-qemu-action        | v3      | c7c53464625b32c7a7e944ae62b3e17d2b600130 |
| docker/setup-buildx-action      | v3      | 8d2750c68a42422c14e847fe6c8ac0403b4cbd6f |
| docker/login-action             | v3      | 5e57cd118135c172c3672efd75eb46360885c0ef |
| docker/metadata-action          | v5      | c299e40c65443455700f0fdfc63efafe5b349051 |
| docker/build-push-action        | v6      | 263435318d21b8e681c14492fe198d362a7d2c83 |
| dependabot/fetch-metadata       | v2      | 21025c705c08248db411dc16f3619e6b5f9ea21a |
| peter-evans/create-pull-request | v8      | 98357b18bf14b5342f975ff684046ec3b2a07725 |
| github/codeql-action            | v4      | cdefb33c0f6224e58673d9004f47f7cb3e328b89 |

**Already Pinned (no changes needed):**

- `anthropics/claude-code-action@1b8ee3b94104046d71fde52ec3557651ad8c0d71`
- `k1LoW/octocov-action@98b913772e0216831bbb756274ea6a3a97e1de96`

---

## Task 1: Pin actions in deploy-prod.yml

**Files:**

- Modify: `.github/workflows/deploy-prod.yml`

**Changes:**

```yaml
# Line 21
- uses: actions/checkout@v6
+ uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6

# Line 27
- uses: docker/setup-qemu-action@v3
+ uses: docker/setup-qemu-action@c7c53464625b32c7a7e944ae62b3e17d2b600130 # v3

# Line 30
- uses: docker/setup-buildx-action@v3
+ uses: docker/setup-buildx-action@8d2750c68a42422c14e847fe6c8ac0403b4cbd6f # v3

# Line 33
- uses: docker/login-action@v3
+ uses: docker/login-action@5e57cd118135c172c3672efd75eb46360885c0ef # v3

# Line 41
- uses: docker/metadata-action@v5
+ uses: docker/metadata-action@c299e40c65443455700f0fdfc63efafe5b349051 # v5

# Line 50
- uses: docker/build-push-action@v6
+ uses: docker/build-push-action@263435318d21b8e681c14492fe198d362a7d2c83 # v6
```

---

## Task 2: Pin actions in deploy-dev.yml

**Files:**

- Modify: `.github/workflows/deploy-dev.yml`

**Changes:**

```yaml
# Line 23
- uses: actions/checkout@v6
+ uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6

# Line 26
- uses: docker/login-action@v3
+ uses: docker/login-action@5e57cd118135c172c3672efd75eb46360885c0ef # v3

# Line 34
- uses: docker/metadata-action@v5
+ uses: docker/metadata-action@c299e40c65443455700f0fdfc63efafe5b349051 # v5

# Line 41
- uses: docker/build-push-action@v6
+ uses: docker/build-push-action@263435318d21b8e681c14492fe198d362a7d2c83 # v6
```

---

## Task 3: Pin actions in dependabot-auto-merge.yml

**Files:**

- Modify: `.github/workflows/dependabot-auto-merge.yml`

**Changes:**

```yaml
# Line 21
- uses: dependabot/fetch-metadata@v2
+ uses: dependabot/fetch-metadata@21025c705c08248db411dc16f3619e6b5f9ea21a # v2
```

---

## Task 4: Pin actions in import-netbox.yml

**Files:**

- Modify: `.github/workflows/import-netbox.yml`

**Changes:**

```yaml
# Line 29
- uses: actions/checkout@v6
+ uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6

# Line 32
- uses: actions/setup-node@v6
+ uses: actions/setup-node@6044e13b5dc448c55e2357c09f80417699197238 # v6

# Line 76
- uses: peter-evans/create-pull-request@v8
+ uses: peter-evans/create-pull-request@98357b18bf14b5342f975ff684046ec3b2a07725 # v8
```

---

## Task 5: Pin actions in test.yml

**Files:**

- Modify: `.github/workflows/test.yml`

**Changes:**

```yaml
# Line 13
- uses: actions/checkout@v6
+ uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6

# Line 16
- uses: actions/setup-node@v6
+ uses: actions/setup-node@6044e13b5dc448c55e2357c09f80417699197238 # v6

# Line 40
- uses: actions/upload-artifact@v6
+ uses: actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6
```

---

## Task 6: Pin actions in code-health.yml

**Files:**

- Modify: `.github/workflows/code-health.yml`

**Changes:**

```yaml
# Line 26
- uses: actions/checkout@v4
+ uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4

# Line 29
- uses: actions/setup-node@v4
+ uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
```

---

## Task 7: Pin actions in codeql.yml

**Files:**

- Modify: `.github/workflows/codeql.yml`

**Changes:**

```yaml
# Line 29
- uses: actions/checkout@v6
+ uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6

# Line 32
- uses: github/codeql-action/init@v4
+ uses: github/codeql-action/init@cdefb33c0f6224e58673d9004f47f7cb3e328b89 # v4

# Line 39
- uses: github/codeql-action/analyze@v4
+ uses: github/codeql-action/analyze@cdefb33c0f6224e58673d9004f47f7cb3e328b89 # v4
```

---

## Task 8: Pin actions in release.yml

**Files:**

- Modify: `.github/workflows/release.yml`

**Changes:**

```yaml
# Line 15
- uses: actions/checkout@v6
+ uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6
```

---

## Task 9: Pin actions in claude.yml

**Files:**

- Modify: `.github/workflows/claude.yml`

**Changes:**

```yaml
# Line 41
- uses: actions/checkout@v6
+ uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6
```

Note: `anthropics/claude-code-action` is already pinned.

---

## Task 10: Pin actions in claude-code-review.yml

**Files:**

- Modify: `.github/workflows/claude-code-review.yml`

**Changes:**

```yaml
# Line 36
- uses: actions/checkout@v6
+ uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6
```

Note: `anthropics/claude-code-action` is already pinned.

---

## Task 11: Pin actions in project-automation.yml

**Files:**

- Modify: `.github/workflows/project-automation.yml`

**Changes:**

```yaml
# Line 13
- uses: actions/add-to-project@v1.0.2
+ uses: actions/add-to-project@244f685bbc3b7adfa8466e08b698b5577571133e # v1.0.2
```

---

## Task 12: Pin actions in issue-labeler.yml

**Files:**

- Modify: `.github/workflows/issue-labeler.yml`

**Changes:**

```yaml
# Line 14
- uses: actions/github-script@v8
+ uses: actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd # v8
```

---

## Task 13: Pin actions in octocov.yml

**Files:**

- Modify: `.github/workflows/octocov.yml`

**Changes:**

```yaml
# Line 19
- uses: actions/checkout@v4
+ uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4

# Line 22
- uses: actions/setup-node@v4
+ uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
```

Note: `k1LoW/octocov-action` is already pinned.

---

## Task 14: Verify and commit

**Step 1: Validate YAML syntax**

```bash
for f in .github/workflows/*.yml; do python3 -c "import yaml; yaml.safe_load(open('$f'))" && echo "$f: OK"; done
```

**Step 2: Commit changes**

```bash
git add .github/workflows/
git commit -m "security: pin all GitHub Actions to commit SHAs

Addresses CodeQL alerts #12-21 for actions/unpinned-tag.

Pinning to commit SHAs prevents supply chain attacks where
upstream maintainers could move version tags to inject
malicious code.

All actions pinned with version comments for readability."
```

**Step 3: Verify CodeQL alerts resolve**
Push changes and check that CodeQL re-scans and closes alerts.

---

## Summary

| Workflow                  | Actions Pinned        |
| ------------------------- | --------------------- |
| deploy-prod.yml           | 6                     |
| deploy-dev.yml            | 4                     |
| dependabot-auto-merge.yml | 1                     |
| import-netbox.yml         | 3                     |
| test.yml                  | 3                     |
| code-health.yml           | 2                     |
| codeql.yml                | 3                     |
| release.yml               | 1                     |
| claude.yml                | 1                     |
| claude-code-review.yml    | 1                     |
| project-automation.yml    | 1                     |
| issue-labeler.yml         | 1                     |
| octocov.yml               | 2                     |
| **Total**                 | **29 actions pinned** |
