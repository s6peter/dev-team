# Multi-stage Dockerfiles for regulated industries (Chainguard base images)

Reference Dockerfiles for the languages you actually meet in banking, healthcare,
government, and insurance. Every file is heavily commented — the comments are the
lesson; the code is the example.

| File | Stack | Where you'll meet it |
|---|---|---|
| `Dockerfile.java-springboot` | Java 21 / Spring Boot / Maven | Core banking, payments, policy admin, claims |
| `Dockerfile.dotnet-aspnet` | .NET 8 / ASP.NET Core | Insurance, healthcare payers, US fed/state gov |
| `Dockerfile.python-fastapi` | Python 3 / FastAPI | HL7/FHIR interop, actuarial & risk models, AML |
| `Dockerfile.go` | Go | Gov cloud services, ledgers, payment switches, platform |
| `Dockerfile.node-nextjs` | Node 22 / Next.js | Online banking, member/patient/citizen portals |
| `Dockerfile.rust` | Rust | New gov greenfield (memory safety), low-latency fintech |
| `dockerignore.example` | — | Copy to repo root as `.dockerignore`. Not optional. |

---

## The pattern, in one paragraph

Every file follows the same shape: **pinned trusted base → build stage that holds
the entire toolchain → runtime stage that receives only the artifact → provenance
labels → numeric non-root UID → exec-form entrypoint.** The build stage is where
compilers, package managers, test frameworks, and build credentials live, and it
is discarded. The runtime stage has no shell and no package manager, so an
attacker who achieves RCE lands somewhere with nothing to pivot with. That single
structural decision satisfies more of NIST SP 800-190 than any scanner ever will.

---

## Why Chainguard specifically

- **Near-zero CVEs.** Built from source on a rolling distro (Wolfi) with same-day
  patching. This changes vulnerability management from a remediation treadmill
  into a rebuild cadence — which is what your SLA reporting actually needs.
- **Non-root by default.** UID `65532` (`nonroot`). CIS 4.1 is satisfied by the
  base image, not by something you have to remember.
- **Signed + attested.** Every image ships a Sigstore signature and an SBOM.
  Verify in CI and enforce at admission:
  ```bash
  cosign verify \
    --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
    --certificate-identity-regexp='https://github\.com/chainguard-images/.*' \
    cgr.dev/chainguard/jre:latest
  ```
- **Distroless runtime tier.** `static`, `glibc-dynamic`, `jre`, `python`,
  `node`, `aspnet-runtime` — no busybox, no apk, no setuid binaries.

### Two things that will bite you

1. **Tag availability.** The free tier generally publishes only `:latest` and
   `:latest-dev`; pinned/historical version tags are a paid feature. Check your
   current entitlement before writing `:openjdk-21.0.5` into a Dockerfile.
2. **`:latest` is a moving target.** Chainguard rebuilds constantly, which is the
   point — but a moving base is incompatible with "we deployed exactly what we
   tested." Resolve the digest in CI, pin it, and let a bot bump it:
   ```
   FROM cgr.dev/chainguard/jre:latest@sha256:<digest>
   ```

---

## Control mapping

| Line in these files | Control |
|---|---|
| `FROM cgr.dev/...@sha256:` | CIS 4.2, 4.5 · NIST SI-7 · SLSA provenance |
| Two-stage split (`AS build` → runtime) | NIST SP 800-190 §4.1 · CIS 4.3 |
| `USER 65532:65532` | **CIS 4.1** · NIST 800-190 §4.5 · the #1 audit finding |
| `COPY` everywhere, `ADD` nowhere | CIS 4.9 |
| `--mount=type=secret` | **CIS 4.10** · PCI-DSS 8.3.1 · HIPAA 164.312(d) |
| Hash/lock pinning (`--require-hashes`, `npm ci`, `--locked`, `--locked-mode`) | CIS 4.11 · PCI-DSS 6.3.2 · EO 14028 supply chain |
| `LABEL org.opencontainers.image.*` | SOX change control · SBOM attribution |
| `--chmod=0444` / `0555` on copied artifacts | Integrity · defeats in-place tamper |
| `STOPSIGNAL` + exec-form `ENTRYPOINT` | Graceful drain → complete audit logs |
| `HEALTHCHECK` (where the runtime allows it) | CIS 4.6 |
| `.dockerignore` | CIS 4.10 · prevents `.git`/`.env` exfiltration via layers |

### Things deliberately absent
`ADD`, `VOLUME`, `ONBUILD`, `MAINTAINER`, `sudo`, `latest` tags in production,
`chmod 777`, secrets in `ENV` or `ARG`, and shell-form `CMD`/`ENTRYPOINT`.

---

## The HEALTHCHECK nuance worth understanding

CIS 4.6 wants a `HEALTHCHECK`. Distroless images have no shell and no `curl`, so
a naive `CMD curl -f ...` simply cannot run. Two honest resolutions:

- **Go / Rust:** compile the probe into the binary as a flag
  (`/server -healthcheck`). Clean, no extra process, control satisfied.
- **Python / Node:** the interpreter is already present, so a one-liner works.
- **Java / .NET:** starting a second JVM or CLR per probe is too expensive.
  Omit it and rely on Kubernetes probes.

And the part people miss: **Kubernetes ignores `HEALTHCHECK` entirely.** It only
runs `livenessProbe` / `readinessProbe` / `startupProbe` from the pod spec. If
you deploy on Kubernetes, the Dockerfile `HEALTHCHECK` is compliance evidence and
local-Docker convenience — the pod spec is the real control.

---

## What the Dockerfile cannot do

A hardened image is roughly half the story. The rest is the runtime contract:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 65532
  runAsGroup: 65532
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  seccompProfile: { type: RuntimeDefault }
  capabilities: { drop: ["ALL"] }
```

`readOnlyRootFilesystem: true` is what makes "no package manager" meaningful —
without it an attacker can still drop tooling into `/tmp` and execute it. Mount
an `emptyDir` at any path the app genuinely needs to write.

---

## Building with attestations

```bash
docker buildx build \
  --build-arg VERSION="$(git describe --tags --always)" \
  --build-arg VCS_REF="$(git rev-parse HEAD)" \
  --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --secret id=maven_settings,src="$HOME/.m2/settings.xml" \
  --sbom=true \
  --provenance=mode=max \
  --push -t registry.internal.example/team/app:1.4.2 .
```

`--sbom=true` attaches an SPDX SBOM; `--provenance=mode=max` attaches SLSA
build provenance. Both travel with the image in the registry, which is what lets
an assessor answer "what is in this artifact and where did it come from?" without
asking your team.

## Verifying your own work

```bash
# Lint the Dockerfile
hadolint Dockerfile.java-springboot

# Policy-as-code (CIS + custom org rules)
checkov -f Dockerfile.java-springboot --framework dockerfile
trivy config Dockerfile.java-springboot

# Scan the built image, and prove nothing leaked into history
trivy image --severity HIGH,CRITICAL myimage:1.4.2
docker history --no-trunc myimage:1.4.2 | grep -iE 'password|token|secret|key'

# Prove it does not run as root
docker inspect -f '{{.Config.User}}' myimage:1.4.2   # -> 65532:65532
```
