---
title: Infrastructure as Code for XDC Nodes
sidebar_position: 13
description: Provision XDC validator, standby, and RPC node infrastructure repeatably with Terraform, Pulumi, or CloudFormation.
---

This guide shows how to provision XDC node infrastructure with Infrastructure-as-Code (IaC) tools. Examples use AWS for concreteness, but the same structure applies to any cloud provider. All code is a **template** — review and adapt instance types, regions, and firewall rules before applying.

## Why Infrastructure as Code

Running a node from ad-hoc console clicks makes the environment hard to reproduce and audit. Codifying it gives you:

- **Repeatability** — spin up an identical standby or RPC node in minutes, on any region.
- **Versioned infrastructure** — every change to instance size, disk, or firewall rules is a reviewed Git commit, not an undocumented click.
- **Fast recovery** — after a host failure, re-apply the stack to get a fresh machine and follow the restore steps in [Backup and Recovery](/docs/xdc-chain/developers/node-operators/backup-recovery).

## What to Codify

| Resource | Recommendation | Notes |
|---|---|---|
| Compute | 6 vCPU, 16 GB RAM | Matches [validator node hardware requirements](/docs/xdc-chain/developers/node-operators/validator-node) (e.g. AWS `m5.2xlarge`-class is overkill on RAM but the closest common fit; `c5.2xlarge` + memory-optimized variants also work) |
| Disk | 1 TB SSD/NVMe, gp3/io2 | Dedicated EBS volume, separate from the root disk, so you can snapshot or detach it independently |
| Firewall | Open 30303 (TCP/UDP) for P2P; SSH (22 or custom) from your admin IP only; RPC 8545 restricted to localhost/trusted CIDRs | See [Masternode](/docs/xdc-chain/developers/node-operators/masternode) for hardening |
| Network | Public IP, no NAT in front of the node | Elastic IP so the address survives instance replacement |
| cloud-init / user_data | Install Docker, clone XinFin-Node, run the setup | Mirrors [Bootstrap](/docs/xdc-chain/developers/node-operators/bootstrap) and [Docker setup](/docs/xdc-chain/developers/node-operators/docker) |

## Terraform Example (AWS)

```hcl
# main.tf — XDC standby/validator node template. Review before applying.
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "admin_cidr"   { description = "Your IP in CIDR form, e.g. 203.0.113.10/32" }
variable "node_name"    { default = "xdc-node" }
variable "network"      { default = "mainnet" } # mainnet/testnet/devnet
variable "az"           { default = "us-east-1a" }

provider "aws" { region = "us-east-1" }

# Latest Ubuntu 22.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_security_group" "xdc" {
  name = "${var.node_name}-sg"

  ingress { # P2P — must be open to the internet
    from_port = 30303
    to_port   = 30303
    protocol  = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress { # P2P discovery over UDP
    from_port = 30303
    to_port   = 30303
    protocol  = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress { # SSH — admin only
    from_port = 22
    to_port   = 22
    protocol  = "tcp"
    cidr_blocks = [var.admin_cidr]
  }
  # RPC 8545 is intentionally NOT opened — it stays bound to localhost.
  egress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Dedicated chain-data volume: 1 TB SSD per hardware requirements.
resource "aws_ebs_volume" "chain_data" {
  availability_zone = var.az
  size              = 1024
  type              = "gp3"
}

resource "aws_instance" "xdc" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "c5.2xlarge" # 8 vCPU / 16 GB RAM
  availability_zone      = var.az
  vpc_security_group_ids = [aws_security_group.xdc.id]
  key_name               = "your-keypair" # change me

  root_block_device { volume_size = 50 } # OS only

  # cloud-init: install Docker, mount chain disk, clone XinFin-Node.
  user_data = <<-EOF
    #!/bin/bash
    set -e
    apt-get update -y
    apt-get install -y docker.io docker-compose
    systemctl enable --now docker

    # Mount the chain data volume at /mnt/xdc
    mkfs.ext4 /dev/xvdf || true
    mkdir -p /mnt/xdc
    mount /dev/xvdf /mnt/xdc
    echo '/dev/xvdf /mnt/xdc ext4 defaults 0 2' >> /etc/fstab

    # Fetch the node setup scripts (see bootstrap/docker guides)
    git clone https://github.com/XinFinOrg/XinFin-Node /opt/XinFin-Node
    cd /opt/XinFin-Node/${var.network}
    cp env.example .env
    # NOTE: bootstrap.sh is interactive (prompts for network/name).
    # For unattended runs use docker-up.sh after editing .env:
    #   bash docker-up.sh
  EOF
}

resource "aws_volume_attachment" "chain" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.chain_data.id
  instance_id = aws_instance.xdc.id
}

resource "aws_eip" "xdc" { instance = aws_instance.xdc.id }

output "public_ip" { value = aws_eip.xdc.public_ip }
```

## Pulumi Sketch (TypeScript)

```typescript
import * as aws from "@pulumi/aws";

const adminCidr = "203.0.113.10/32"; // change me

const sg = new aws.ec2.SecurityGroup("xdc-sg", {
  ingress: [
    { protocol: "tcp", fromPort: 30303, toPort: 30303, cidrBlocks: ["0.0.0.0/0"] }, // P2P
    { protocol: "udp", fromPort: 30303, toPort: 30303, cidrBlocks: ["0.0.0.0/0"] }, // discovery
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: [adminCidr] },         // SSH
  ],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});

const ami = aws.ec2.getAmiOutput({
  mostRecent: true,
  owners: ["099720109477"],
  filters: [{ name: "name", values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"] }],
});

const node = new aws.ec2.Instance("xdc-node", {
  ami: ami.id,
  instanceType: "c5.2xlarge",
  vpcSecurityGroupIds: [sg.id],
  keyName: "your-keypair",
  rootBlockDevice: { volumeSize: 50 },
  userData: `#!/bin/bash
    apt-get update -y && apt-get install -y docker.io docker-compose
    systemctl enable --now docker
    git clone https://github.com/XinFinOrg/XinFin-Node /opt/XinFin-Node`,
});

const chainData = new aws.ebs.Volume("xdc-chain", {
  availabilityZone: node.availabilityZone,
  size: 1024,
  type: "gp3",
});

new aws.ec2.VolumeAttachment("xdc-chain-attach", {
  deviceName: "/dev/xvdf",
  volumeId: chainData.id,
  instanceId: node.id,
});

export const publicIp = node.publicIp;
```

## CloudFormation Sketch (YAML)

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: XDC node (validator/standby) — template, review before use.
Parameters:
  AdminCidr:
    Type: String
    Default: 203.0.113.10/32
  KeyPair:
    Type: AWS::EC2::KeyPair::KeyName

Resources:
  XdcSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: XDC node firewall
      SecurityGroupIngress:
        - { IpProtocol: tcp, FromPort: 30303, ToPort: 30303, CidrIp: 0.0.0.0/0 }
        - { IpProtocol: udp, FromPort: 30303, ToPort: 30303, CidrIp: 0.0.0.0/0 }
        - { IpProtocol: tcp, FromPort: 22, ToPort: 22, CidrIp: !Ref AdminCidr }

  XdcInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: c5.2xlarge
      KeyName: !Ref KeyPair
      ImageId: resolve:ssm:/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id
      SecurityGroupIds: [!Ref XdcSecurityGroup]
      BlockDeviceMappings:
        - DeviceName: /dev/sda1
          Ebs: { VolumeSize: 50 }
        - DeviceName: /dev/xvdf
          Ebs: { VolumeSize: 1024, VolumeType: gp3 }
      UserData:
        Fn::Base64: |
          #!/bin/bash
          apt-get update -y
          apt-get install -y docker.io docker-compose
          systemctl enable --now docker
          git clone https://github.com/XinFinOrg/XinFin-Node /opt/XinFin-Node

  XdcEip:
    Type: AWS::EC2::EIP
    Properties:
      InstanceId: !Ref XdcInstance

Outputs:
  PublicIp:
    Value: !Ref XdcEip
```

## Secrets Handling

**Never put node private keys, keystore files, or `.env` contents in IaC code, user_data, or Terraform/Pulumi state.** Anything in `user_data` is readable by anyone with EC2 describe permissions, and Terraform state stores attribute values in plaintext. Instead:

1. Let IaC provision an empty machine and let the setup generate a fresh key, **or**
2. Inject the existing key post-provision over SSH (`scp` with `chmod 600`), never via user_data.

Follow the key backup and permission rules in [Validator/Standby Node — Key Generation and Management](/docs/xdc-chain/developers/node-operators/validator-node#key-generation-and-management).

## State Management and Teardown

- Keep Terraform/Pulumi state in a remote, access-controlled backend (S3 + locking, Pulumi Cloud) — it contains resource metadata your team needs for recovery.
- **Never run `terraform destroy` / `pulumi down` on a validator without first backing up the node private key and chain data.** Set `prevent_destroy` lifecycle rules (Terraform) or `protect: true` (Pulumi) on the chain-data volume.
- For full backup and restore procedures, see [Backup and Recovery](/docs/xdc-chain/developers/node-operators/backup-recovery).

## See Also

- [Run XDC Nodes using Bootstrap Script](/docs/xdc-chain/developers/node-operators/bootstrap)
- [Validator/Standby Node](/docs/xdc-chain/developers/node-operators/validator-node)
- [Running XDC Nodes on Kubernetes](/docs/xdc-chain/developers/node-operators/kubernetes)
