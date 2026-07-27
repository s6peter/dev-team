# syntax=docker/dockerfile:1.10
# check=error=true
# =============================================================================
# Go  —  the default for government/public-sector cloud services, payment
# switches and ledger infrastructure, and internal platform tooling everywhere.
#
# This is the gold-standard container: a statically linked binary on
# chainguard/static. The final image has no libc, no shell, no package manager,
# and typically zero CVEs — which makes vulnerability-SLA reporting trivial.
#
# Controls demonstrated:
#   CIS Docker 4.1, 4.2, 4.6, 4.9, 4.10 | NIST SP 800-190 §4.1, §4.5
#   FIPS 140-3 crypto module selection (see GOFIPS140 below) | FedRAMP SC-13
# =============================================================================


# -----------------------------------------------------------------------------
# STAGE 1 — compile
# -----------------------------------------------------------------------------
FROM cgr.dev/chainguard/go:latest AS build

USER root
RUN mkdir -p /src && chown 65532:65532 /src
USER 65532:65532

WORKDIR /src

ARG VERSION=0.0.0-dev
ARG VCS_REF=unknown

COPY --chown=65532:65532 go.mod go.sum ./

# `go mod verify` re-checks every module against go.sum. Combined with
# GOFLAGS=-mod=readonly and a checksum-DB proxy (or GOPRIVATE + an internal
# Athens mirror in an air-gapped estate), this pins the whole dependency graph.
RUN --mount=type=cache,target=/home/nonroot/go/pkg/mod,uid=65532,gid=65532 \
    go mod download && go mod verify

COPY --chown=65532:65532 . .

RUN --mount=type=cache,target=/home/nonroot/go/pkg/mod,uid=65532,gid=65532 \
    --mount=type=cache,target=/home/nonroot/.cache/go-build,uid=65532,gid=65532 \
    go vet ./... && go test ./...

# CGO_ENABLED=0  -> fully static, so chainguard/static works as the base.
# -trimpath      -> strips build-machine paths; required for reproducibility.
# -buildid=      -> removes the last source of non-determinism in the binary.
# -s -w          -> drop symbol table and DWARF; smaller, less to reverse.
#
# FIPS: Go 1.24+ ships a CMVP-validated crypto module. For FedRAMP/FISMA work
# add  ENV GOFIPS140=v1.0.0  here and run with GODEBUG=fips140=on. Confirm the
# validated version against the current NIST CMVP listing before relying on it.
RUN --mount=type=cache,target=/home/nonroot/go/pkg/mod,uid=65532,gid=65532 \
    --mount=type=cache,target=/home/nonroot/.cache/go-build,uid=65532,gid=65532 \
    CGO_ENABLED=0 GOOS=linux \
    go build -trimpath \
      -ldflags="-s -w -buildid= -X main.version=${VERSION} -X main.commit=${VCS_REF}" \
      -o /home/nonroot/server ./cmd/server


# -----------------------------------------------------------------------------
# STAGE 2 — runtime
#
# chainguard/static contains: ca-certificates, tzdata, /etc/passwd with a
# nonroot user, and nothing else. No /bin/sh. No libc. Roughly 2 MB.
# Pair it with a read-only root filesystem and drop ALL capabilities.
# -----------------------------------------------------------------------------
FROM cgr.dev/chainguard/static:latest AS runtime

ARG VERSION=0.0.0-dev
ARG VCS_REF=unknown
ARG BUILD_DATE=1970-01-01T00:00:00Z

LABEL org.opencontainers.image.title="ledger-svc" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://git.internal.example/core/ledger" \
      org.opencontainers.image.vendor="Example Federal Services" \
      io.internal.app-id="APP-31007" \
      io.internal.data-classification="cui" \
      io.internal.owner="core-ledger@example.gov"

COPY --from=build --chown=65532:65532 --chmod=0555 /home/nonroot/server /server

USER 65532:65532

EXPOSE 8080
STOPSIGNAL SIGTERM

# Go can satisfy CIS 4.6 cleanly: compile the probe into the binary itself as a
# subcommand, so no shell, curl, or second process is needed.
#   if len(os.Args) > 1 && os.Args[1] == "-healthcheck" { ...GET /healthz... }
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/server", "-healthcheck"]

ENTRYPOINT ["/server"]
