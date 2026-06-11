---
title: Infrastructure as Code for XDC Nodes
description: Terraform, Pulumi, CloudFormation, and Ansible examples for deploying XDC node infrastructure on AWS, GCP, and Azure.
---

# Infrastructure as Code for XDC Nodes

This guide provides Infrastructure-as-Code (IaC) examples for deploying XDC Network node infrastructure across major cloud providers. Using IaC ensures reproducible, version-controlled, and auditable deployments.

## Table of Contents

1. [Overview](#overview)
2. [Terraform](#terraform)
3. [Pulumi](#pulumi)
4. [CloudFormation](#cloudformation)
5. [Ansible](#ansible)
6. [State Management](#state-management)
7. [Security Best Practices](#security-best-practices)
8. [Cost Estimation](#cost-estimation)

---

## Overview

### Why IaC for Blockchain Nodes

- **Reproducibility**: Identical environments across dev, staging, production
- **Version Control**: Track infrastructure changes in Git
- **Auditability**: Know who changed what and when
- **Scalability**: Spin up new regions in minutes
- **Disaster Recovery**: Rebuild entire infrastructure from code

### Tool Comparison

| Tool | Best For | Learning Curve | Ecosystem |
|------|----------|---------------|-----------|
| Terraform | Multi-cloud, modules | Medium | Largest |
| Pulumi | Developers preferring code | Medium | Growing |
| CloudFormation | AWS-only, native integration | Low | AWS-specific |
| Ansible | Configuration management | Low | Mature |

---

## Terraform

### Project Structure

```
terraform/
├── modules/
│   ├── xdc-node/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   └── vpc/
│       └── ...
├── environments/
│   ├── mainnet/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── testnet/
│       └── ...
└── backend.tf
```

### VPC Module

```hcl
# modules/vpc/main.tf
resource "aws_vpc" "xdc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "xdc-${var.environment}"
  }
}

resource "aws_internet_gateway" "xdc" {
  vpc_id = aws_vpc.xdc.id

  tags = {
    Name = "xdc-${var.environment}"
  }
}

resource "aws_subnet" "xdc_public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.xdc.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "xdc-${var.environment}-public-${count.index + 1}"
  }
}

resource "aws_subnet" "xdc_private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.xdc.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "xdc-${var.environment}-private-${count.index + 1}"
  }
}

resource "aws_security_group" "xdc_node" {
  name_prefix = "xdc-node-"
  vpc_id      = aws_vpc.xdc.id

  # P2P
  ingress {
    from_port   = 30303
    to_port     = 30303
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 30303
    to_port     = 30303
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # RPC (restricted)
  ingress {
    from_port   = 8545
    to_port     = 8545
    protocol    = "tcp"
    cidr_blocks = var.allowed_rpc_cidrs
  }

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "xdc-${var.environment}-node"
  }
}
```

### XDC Node Module

```hcl
# modules/xdc-node/main.tf
resource "aws_instance" "xdc_node" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.security_group_id]
  key_name               = var.key_name

  root_block_device {
    volume_size = 100
    volume_type = "gp3"
    encrypted   = true
  }

  ebs_block_device {
    device_name = "/dev/sdf"
    volume_size = var.chain_data_size
    volume_type = "gp3"
    iops        = 16000
    throughput  = 1000
    encrypted   = true
  }

  user_data = templatefile("${path.module}/userdata.sh", {
    node_type    = var.node_type
    network      = var.network
    coinbase     = var.coinbase
    snapshot_url = var.snapshot_url
  })

  tags = {
    Name        = "xdc-${var.environment}-${var.node_type}-${var.index}"
    Environment = var.environment
    NodeType    = var.node_type
  }
}

resource "aws_eip" "xdc_node" {
  count    = var.node_type == "masternode" ? 1 : 0
  instance = aws_instance.xdc_node.id
  domain   = "vpc"

  tags = {
    Name = "xdc-${var.environment}-masternode-ip"
  }
}

resource "aws_cloudwatch_metric_alarm" "xdc_cpu" {
  alarm_name          = "xdc-${var.environment}-${var.node_type}-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "CPU utilization high"

  dimensions = {
    InstanceId = aws_instance.xdc_node.id
  }
}
```

### User Data Script

```bash
#!/bin/bash
# modules/xdc-node/userdata.sh

set -e

# Update system
apt-get update
apt-get install -y docker.io docker-compose git jq awscli

# Mount data volume
mkfs -t ext4 /dev/nvme1n1
mkdir -p /opt/xdc
mount /dev/nvme1n1 /opt/xdc
echo '/dev/nvme1n1 /opt/xdc ext4 defaults,nofail 0 2' >> /etc/fstab

# Clone node repository
cd /opt/xdc
git clone https://github.com/XinFinOrg/XinFin-Node.git
cd XinFin-Node

# Configure
mkdir -p mainnet
cat > mainnet/.env <<EOF
NODE_NAME=xdc-${node_type}-$(hostname)
CONTACT_EMAIL=ops@example.com
EOF

# Download snapshot if provided
if [ -n "${snapshot_url}" ]; then
  cd mainnet
  wget "${snapshot_url}" -O xdcchain.tar
  tar -xf xdcchain.tar
  rm xdcchain.tar
fi

# Start node
cd /opt/xdc/XinFin-Node/mainnet
docker-compose up -d

# Setup CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'CWEOF'
{
  "metrics": {
    "namespace": "XDC/Nodes",
    "metrics_collected": {
      "disk": {
        "measurement": ["used_percent"],
        "resources": ["/opt/xdc"]
      },
      "mem": {
        "measurement": ["used_percent"]
      }
    }
  }
}
CWEOF

systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent
```

### Mainnet Environment

```hcl
# environments/mainnet/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "xdc-terraform-state"
    key            = "mainnet/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = "mainnet"
      Project     = "xdc-network"
      ManagedBy   = "terraform"
    }
  }
}

module "vpc" {
  source = "../../modules/vpc"

  environment         = "mainnet"
  vpc_cidr            = "10.0.0.0/16"
  availability_zones  = ["us-east-1a", "us-east-1b", "us-east-1c"]
  allowed_rpc_cidrs   = ["10.0.0.0/8"]
  allowed_ssh_cidrs   = ["YOUR_OFFICE_IP/32"]
}

module "masternode" {
  source = "../../modules/xdc-node"

  environment       = "mainnet"
  node_type         = "masternode"
  index             = 1
  ami_id            = "ami-0c02fb55956c7d316" # Ubuntu 22.04
  instance_type     = "m6i.4xlarge"
  subnet_id         = module.vpc.public_subnet_ids[0]
  security_group_id = module.vpc.security_group_id
  key_name          = var.ssh_key_name
  chain_data_size   = 4000
  network           = "mainnet"
  coinbase          = var.masternode_coinbase
}

module "fullnode" {
  source = "../../modules/xdc-node"

  count = 2

  environment       = "mainnet"
  node_type         = "fullnode"
  index             = count.index + 1
  ami_id            = "ami-0c02fb55956c7d316"
  instance_type     = "m6i.2xlarge"
  subnet_id         = module.vpc.private_subnet_ids[count.index]
  security_group_id = module.vpc.security_group_id
  key_name          = var.ssh_key_name
  chain_data_size   = 2000
  network           = "mainnet"
}
```

### Usage

```bash
# Initialize
cd environments/mainnet
terraform init

# Plan
terraform plan -var-file="terraform.tfvars"

# Apply
terraform apply -var-file="terraform.tfvars"

# Destroy (emergency)
terraform destroy -var-file="terraform.tfvars"
```

---

## Pulumi

### TypeScript Example

```typescript
// pulumi/index.ts
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const environment = config.require("environment");
const nodeType = config.get("nodeType") || "fullnode";

// VPC
const vpc = new aws.ec2.Vpc("xdc-vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: { Name: `xdc-${environment}` },
});

const igw = new aws.ec2.InternetGateway("xdc-igw", {
  vpcId: vpc.id,
  tags: { Name: `xdc-${environment}` },
});

const subnet = new aws.ec2.Subnet("xdc-subnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: "us-east-1a",
  mapPublicIpOnLaunch: true,
  tags: { Name: `xdc-${environment}-public` },
});

// Security Group
const sg = new aws.ec2.SecurityGroup("xdc-sg", {
  vpcId: vpc.id,
  ingress: [
    { protocol: "tcp", fromPort: 30303, toPort: 30303, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "udp", fromPort: 30303, toPort: 30303, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: [config.require("sshCidr")] },
  ],
  egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
  tags: { Name: `xdc-${environment}` },
});

// EC2 Instance
const instance = new aws.ec2.Instance("xdc-node", {
  ami: "ami-0c02fb55956c7d316",
  instanceType: nodeType === "masternode" ? "m6i.4xlarge" : "m6i.2xlarge",
  subnetId: subnet.id,
  vpcSecurityGroupIds: [sg.id],
  keyName: config.require("keyName"),
  rootBlockDevice: {
    volumeSize: 100,
    volumeType: "gp3",
    encrypted: true,
  },
  ebsBlockDevices: [{
    deviceName: "/dev/sdf",
    volumeSize: nodeType === "masternode" ? 4000 : 2000,
    volumeType: "gp3",
    iops: 16000,
    throughput: 1000,
    encrypted: true,
  }],
  userData: `#!/bin/bash
    apt-get update
    apt-get install -y docker.io docker-compose git
    mkfs -t ext4 /dev/nvme1n1
    mkdir -p /opt/xdc
    mount /dev/nvme1n1 /opt/xdc
    cd /opt/xdc
    git clone https://github.com/XinFinOrg/XinFin-Node.git
    cd XinFin-Node/mainnet
    docker-compose up -d
  `,
  tags: {
    Name: `xdc-${environment}-${nodeType}`,
    Environment: environment,
    NodeType: nodeType,
  },
});

// Elastic IP for masternode
if (nodeType === "masternode") {
  new aws.ec2.Eip("xdc-eip", {
    instance: instance.id,
    domain: "vpc",
    tags: { Name: `xdc-${environment}-masternode` },
  });
}

export const instanceId = instance.id;
export const publicIp = instance.publicIp;
export const privateIp = instance.privateIp;
```

### Python Example

```python
# pulumi/__main__.py
import pulumi
import pulumi_aws as aws

config = pulumi.Config()
environment = config.require("environment")
node_type = config.get("node_type") or "fullnode"

vpc = aws.ec2.Vpc("xdc-vpc",
    cidr_block="10.0.0.0/16",
    enable_dns_hostnames=True,
    tags={"Name": f"xdc-{environment}"})

subnet = aws.ec2.Subnet("xdc-subnet",
    vpc_id=vpc.id,
    cidr_block="10.0.1.0/24",
    availability_zone="us-east-1a",
    map_public_ip_on_launch=True)

sg = aws.ec2.SecurityGroup("xdc-sg",
    vpc_id=vpc.id,
    ingress=[
        {"protocol": "tcp", "from_port": 30303, "to_port": 30303, "cidr_blocks": ["0.0.0.0/0"]},
        {"protocol": "tcp", "from_port": 22, "to_port": 22, "cidr_blocks": [config.require("ssh_cidr")]},
    ],
    egress=[{"protocol": "-1", "from_port": 0, "to_port": 0, "cidr_blocks": ["0.0.0.0/0"]}])

instance = aws.ec2.Instance("xdc-node",
    ami="ami-0c02fb55956c7d316",
    instance_type="m6i.4xlarge" if node_type == "masternode" else "m6i.2xlarge",
    subnet_id=subnet.id,
    vpc_security_group_ids=[sg.id],
    key_name=config.require("key_name"),
    tags={"Name": f"xdc-{environment}-{node_type}"})

pulumi.export("instance_id", instance.id)
pulumi.export("public_ip", instance.public_ip)
```

### Pulumi Usage

```bash
# Login to Pulumi Cloud (or self-hosted)
pulumi login

# Create stack
pulumi stack init mainnet

# Set configuration
pulumi config set environment mainnet
pulumi config set nodeType masternode
pulumi config set sshCidr 203.0.113.0/24 --secret

# Deploy
pulumi up

# Destroy
pulumi destroy
```

---

## CloudFormation

### Template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'XDC Network Node Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: mainnet
    AllowedValues: [mainnet, testnet]
  NodeType:
    Type: String
    Default: fullnode
    AllowedValues: [masternode, fullnode, archive]
  KeyName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: EC2 Key Pair
  VpcCidr:
    Type: String
    Default: 10.0.0.0/16
  SshCidr:
    Type: String
    Default: 0.0.0.0/0
    Description: CIDR allowed for SSH

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCidr
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub "xdc-${Environment}"

  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub "xdc-${Environment}"

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [0, !Cidr [!Ref VpcCidr, 3, 8]]
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub "xdc-${Environment}-public"

  SecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: XDC Node Security Group
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 30303
          ToPort: 30303
          CidrIp: 0.0.0.0/0
        - IpProtocol: udp
          FromPort: 30303
          ToPort: 30303
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: !Ref SshCidr
      SecurityGroupEgress:
        - IpProtocol: '-1'
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub "xdc-${Environment}"

  NodeInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0c02fb55956c7d316
      InstanceType: !If [IsMasternode, m6i.4xlarge, m6i.2xlarge]
      KeyName: !Ref KeyName
      SubnetId: !Ref PublicSubnet
      SecurityGroupIds:
        - !Ref SecurityGroup
      BlockDeviceMappings:
        - DeviceName: /dev/sda1
          Ebs:
            VolumeSize: 100
            VolumeType: gp3
            Encrypted: true
        - DeviceName: /dev/sdf
          Ebs:
            VolumeSize: !If [IsMasternode, 4000, 2000]
            VolumeType: gp3
            Iops: 16000
            Throughput: 1000
            Encrypted: true
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          apt-get update
          apt-get install -y docker.io docker-compose git
          mkfs -t ext4 /dev/nvme1n1
          mkdir -p /opt/xdc
          mount /dev/nvme1n1 /opt/xdc
          cd /opt/xdc
          git clone https://github.com/XinFinOrg/XinFin-Node.git
          cd XinFin-Node/mainnet
          docker-compose up -d
      Tags:
        - Key: Name
          Value: !Sub "xdc-${Environment}-${NodeType}"
        - Key: NodeType
          Value: !Ref NodeType

  MasternodeEIP:
    Type: AWS::EC2::EIP
    Condition: IsMasternode
    Properties:
      Domain: vpc
      InstanceId: !Ref NodeInstance

Conditions:
  IsMasternode: !Equals [!Ref NodeType, masternode]

Outputs:
  InstanceId:
    Description: EC2 Instance ID
    Value: !Ref NodeInstance
  PublicIp:
    Description: Public IP Address
    Value: !GetAtt NodeInstance.PublicIp
  PrivateIp:
    Description: Private IP Address
    Value: !GetAtt NodeInstance.PrivateIp
```

### Usage

```bash
# Create stack
aws cloudformation create-stack \
  --stack-name xdc-mainnet-masternode \
  --template-body file://template.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=mainnet \
    ParameterKey=NodeType,ParameterValue=masternode \
    ParameterKey=KeyName,ParameterValue=my-key \
  --capabilities CAPABILITY_IAM

# Update stack
aws cloudformation update-stack \
  --stack-name xdc-mainnet-masternode \
  --template-body file://template.yaml \
  --parameters ...

# Delete stack
aws cloudformation delete-stack \
  --stack-name xdc-mainnet-masternode
```

---

## Ansible

### Playbook

```yaml
# ansible/playbook.yml
---
- name: Deploy XDC Node
  hosts: xdc_nodes
  become: yes
  vars:
    xdc_version: "latest"
    network: "mainnet"
    node_type: "fullnode"
    data_dir: "/opt/xdc"

  tasks:
    - name: Update apt cache
      apt:
        update_cache: yes
        cache_valid_time: 3600

    - name: Install dependencies
      apt:
        name:
          - docker.io
          - docker-compose
          - git
          - jq
          - awscli
        state: present

    - name: Create data directory
      file:
        path: "{{ data_dir }}"
        state: directory
        owner: root
        group: root
        mode: '0755'

    - name: Mount data volume
      mount:
        path: "{{ data_dir }}"
        src: /dev/nvme1n1
        fstype: ext4
        state: mounted
      when: ansible_devices.nvme1n1 is defined

    - name: Format data volume
      filesystem:
        fstype: ext4
        dev: /dev/nvme1n1
      when: ansible_devices.nvme1n1 is defined

    - name: Clone XinFin-Node repository
      git:
        repo: https://github.com/XinFinOrg/XinFin-Node.git
        dest: "{{ data_dir }}/XinFin-Node"
        version: master

    - name: Configure environment
      template:
        src: env.j2
        dest: "{{ data_dir }}/XinFin-Node/{{ network }}/.env"
        mode: '0600'
      vars:
        node_name: "xdc-{{ node_type }}-{{ inventory_hostname }}"

    - name: Start XDC node
      docker_compose:
        project_src: "{{ data_dir }}/XinFin-Node/{{ network }}"
        state: present
        detached: yes

    - name: Configure UFW
      ufw:
        rule: allow
        port: "{{ item }}"
        proto: "{{ 'tcp' if item != '30303' else 'any' }}"
      loop:
        - 30303
        - 8545
        - 22

    - name: Enable UFW
      ufw:
        state: enabled
        policy: deny

    - name: Setup logrotate
      template:
        src: logrotate-xdc.j2
        dest: /etc/logrotate.d/xdc

    - name: Configure monitoring
      template:
        src: prometheus.yml.j2
        dest: /opt/prometheus/prometheus.yml
      notify: restart prometheus

  handlers:
    - name: restart prometheus
      service:
        name: prometheus
        state: restarted
```

### Inventory

```ini
# ansible/inventory.ini
[masternodes]
masternode-1 ansible_host=203.0.113.10 node_type=masternode

[fullnodes]
fullnode-1 ansible_host=198.51.100.20 node_type=fullnode
fullnode-2 ansible_host=198.51.100.21 node_type=fullnode

[standby]
standby-1 ansible_host=192.0.2.30 node_type=standby

[xdc_nodes:children]
masternodes
fullnodes
standby

[xdc_nodes:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/.ssh/xdc-nodes.pem
ansible_python_interpreter=/usr/bin/python3
```

### Usage

```bash
# Install roles
ansible-galaxy install -r requirements.yml

# Check connectivity
ansible -i inventory.ini xdc_nodes -m ping

# Deploy
ansible-playbook -i inventory.ini playbook.yml

# Deploy specific group
ansible-playbook -i inventory.ini playbook.yml --limit masternodes

# Check status
ansible -i inventory.ini xdc_nodes -a "docker ps"
```

---

## State Management

### Terraform Remote State

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "xdc-terraform-state"
    key            = "${var.environment}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

### State Locking

```bash
# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Pulumi State

```bash
# Use Pulumi Cloud (recommended)
pulumi login

# Or self-hosted S3 backend
pulumi login s3://xdc-pulumi-state
```

---

## Security Best Practices

### Secret Management

| Secret | Storage | Access |
|--------|---------|--------|
| AWS Credentials | IAM Roles | Instance profiles |
| SSH Keys | AWS Secrets Manager | IAM-controlled |
| Node Keys | HashiCorp Vault | AppRole authentication |
| API Keys | AWS Secrets Manager | Lambda/ECS only |

### Network Security

- Use private subnets for full nodes
- Restrict SSH to bastion hosts or VPN
- Enable VPC Flow Logs
- Use AWS Network Firewall or Security Groups

### Encryption

- EBS volumes encrypted with KMS
- S3 buckets with SSE-S3 or SSE-KMS
- Terraform state encrypted at rest
- Secrets encrypted in transit (TLS 1.3)

---

## Cost Estimation

### AWS Monthly Costs (us-east-1)

| Component | Masternode | Full Node | Archive |
|-----------|-----------|-----------|---------|
| EC2 (on-demand) | $500-700 | $250-350 | $1000-1400 |
| EBS (gp3) | $320-640 | $160-320 | $640-1280 |
| Data Transfer | $50-100 | $20-50 | $100-200 |
| Load Balancer | $20-30 | $0 | $0 |
| Monitoring | $20-40 | $10-20 | $40-80 |
| **Total** | **$910-1510** | **$440-740** | **$1780-2960** |

### Cost Optimization

- Use Reserved Instances (40-60% savings)
- Use Spot Instances for full nodes (not masternodes)
- Enable EBS gp3 without provisioning IOPS unless needed
- Use S3 Intelligent-Tiering for backups

---

## Related Topics

- [Kubernetes Deployment](../kubernetes/index.md): Containerized deployment
- [Helm Charts](../helm/index.md): Helm chart deployment
- [Backup and Recovery](../backup/index.md): Backup strategies
- [Monitoring and Observability](../monitoring/index.md): Prometheus and Grafana
