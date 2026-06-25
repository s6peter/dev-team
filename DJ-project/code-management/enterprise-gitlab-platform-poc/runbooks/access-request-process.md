# Access Request Process

## Roles

| Role | Use |
|---|---|
| Guest | Minimal read access |
| Reporter | Read code, issues, pipelines, and artifacts |
| Developer | Push feature branches and run pipelines |
| Maintainer | Manage protected branches, variables, releases |
| Owner | Group administration only |

## Request Flow

1. User submits access request with business justification.
2. Application owner approves.
3. Platform team maps the user to the correct GitLab group.
4. Access is granted through SAML/LDAP group mapping where possible.
5. Access is reviewed during quarterly recertification.

## Guardrails

- No direct owner access for normal development.
- Production variables are protected and masked.
- Maintainers cannot bypass security policy without documented exception.
- Break-glass access expires after incident closure.

