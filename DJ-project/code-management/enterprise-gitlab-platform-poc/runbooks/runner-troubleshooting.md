# Runner Troubleshooting

## Symptoms

- Jobs are stuck.
- Runner pods fail to start.
- Docker-in-Docker jobs fail.
- Pipelines are slow during peak times.

## Checks

```bash
kubectl get pods -n gitlab-runner
kubectl describe pod -n gitlab-runner <pod>
kubectl logs -n gitlab-runner deploy/gitlab-runner
kubectl top pods -n gitlab-runner
```

In GitLab, check:

- Admin Area > CI/CD > Runners
- Runner tags match project jobs.
- Runner token is valid.
- Project is allowed to use the runner.

## Common Fixes

Delete failed pods:

```bash
./scripts/cleanup-runner-pods.sh gitlab-runner
```

Restart runner deployment:

```bash
kubectl rollout restart deployment/gitlab-runner -n gitlab-runner
```

Scale node group:

```bash
aws eks update-nodegroup-config \
  --cluster-name <cluster> \
  --nodegroup-name <nodegroup> \
  --scaling-config minSize=1,maxSize=4,desiredSize=2
```

