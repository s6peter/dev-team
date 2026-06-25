
#python3 -m venv myenv
#source myenv/bin/activate
#pip install kubernetes




from kubernetes import client, config

config.load_kube_config()
v1 = client.CoreV1Api()

pods = v1.list_namespaced_pod(namespace='default')

print("{:<20} {:<10} {:<10} {:<10} {:<10}".format("NAME", "READY", "STATUS", "RESTARTS", "AGE"))

for pod in pods.items:
    name = pod.metadata.name
    status = pod.status.phase
    ready_containers = sum(1 for c in pod.status.container_statuses if c.ready)
    total_containers = len(pod.status.container_statuses)
    restarts = sum(c.restart_count for c in pod.status.container_statuses)
    age = pod.metadata.creation_timestamp

    print("{:<20} {}/{}       {:<10} {:<10} {}".format(
        name, ready_containers, total_containers, status, restarts, age.strftime('%H:%M:%S')
    ))
