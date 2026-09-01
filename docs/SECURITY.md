# Security & Governance Specification — AI YouTube Automation OS

## 1. Authentication & Role-Based Access Control (RBAC)

The system enforces strict RBAC across 4 distinct user tiers:

| Role | Permissions & Scope |
| :--- | :--- |
| **`OWNER`** | Full system control: Project creation, agent configuration, budget limits, user management, and final YouTube publishing signoff. |
| **`ADMIN`** | Project management, agent task intervention, and team administration. |
| **`EDITOR`** | Reviewing intermediate project outputs, requesting targeted revisions, and previewing renders. |
| **`VIEWER`** | Read-only access to project assets, transcripts, and analytics reports. |

---

## 2. YouTube OAuth2 Credential Security

- **Zero Password Storage Policy**: The platform never requests or stores Google account passwords. All channel interactions utilize Google OAuth2 authorization flows with PKCE and limited `youtube.upload` scopes.
- **Token Protection**: Access and refresh tokens are encrypted at rest and never exposed in client logs or audit records.

---

## 3. Human Publishing Gate & Approval Token Invalidation

- **Cryptographic Approval Tokens**: Every human approval generates a unique `APPROVAL_ID` bound to the exact project version and media checksum.
- **Automatic Token Invalidation**: If any critical asset (script, voiceover, render, title, or thumbnail) is modified after approval, the existing approval token is instantly invalidated, returning the project to `HUMAN_REVIEW`.

---

## 4. Least Privilege Secret Access Model

Individual specialist agents only receive access to the minimal credentials required for their domain (e.g. Agent 5 only accesses TTS APIs; Agent 6 only accesses Image generation APIs). Orchestration keys remain restricted to Agent 10.
