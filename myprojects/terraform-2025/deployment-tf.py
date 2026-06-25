import subprocess
import os
import sys

def run_command(command, cwd=None):
    """Run a shell command and print output."""
    try:
        print(f"\nRunning: {' '.join(command)}")
        subprocess.run(command, cwd=cwd, check=True, text=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running command: {e}")
        sys.exit(1)

def deploy(terraform_dir):
    print(f"🚀 Deploying Terraform in: {terraform_dir}")
    run_command(["terraform", "init"], cwd=terraform_dir)
    run_command(["terraform", "validate"], cwd=terraform_dir)
    run_command(["terraform", "plan"], cwd=terraform_dir)
    run_command(["terraform", "apply", "-auto-approve"], cwd=terraform_dir)
    print("✅ Deployment complete.")

def destroy(terraform_dir):
    print(f"💣 Destroying Terraform infrastructure in: {terraform_dir}")
    run_command(["terraform", "destroy", "-auto-approve"], cwd=terraform_dir)
    print("🧹 Destruction complete.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python terraform_deploy.py <terraform_dir> [--destroy]")
        sys.exit(1)

    terraform_dir = sys.argv[1]
    destroy_flag = "--destroy" in sys.argv

    if not os.path.isdir(terraform_dir):
        print(f"❌ Directory '{terraform_dir}' not found.")
        sys.exit(1)

    if destroy_flag:
        destroy(terraform_dir)
    else:
        deploy(terraform_dir)

