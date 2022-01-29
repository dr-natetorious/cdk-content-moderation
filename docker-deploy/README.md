# Docker-Enabled Deployment Scripts

This folder contains utility scripts for troubleshooting or deploying the solution.  They are available for Windows and Mac workstations.

## What are the prerequiste steps to using these scripts

Customers need to [configure the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) and [install Docker](https://docs.docker.com/engine/install/).

## How can I troubleshoot deployments

Customers can launch a terminal window for [Windows](debug.bat) or [Mac](debug.sh).  The script will build the [cdk-deploy](../images/cdk-deploy) Docker image and then run it as an interactive session.

Note: The scripts assume that system user is `root` and has home directory of `/root`.  If your specific environment uses a different account or home directory, then you must update the script accordingly.
