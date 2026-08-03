# Host VM Security Hardening Guide

While our Docker containers and network configurations are secured, the host Virtual Machine (e.g., Oracle Cloud Compute, AWS EC2) needs to be hardened as well to prevent unauthorized access and protect against OS-level vulnerabilities.

## 1. Automated Security Patching
Keep your host OS patched automatically rather than relying on manual, ad-hoc updates.

For Debian/Ubuntu:
```bash
sudo apt update
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```
*Select "Yes" when prompted to automatically download and install stable updates.*

## 2. SSH Hardening
Never allow password-based SSH logins. Ensure only key-based authentication is used.

Edit the SSH configuration file:
```bash
sudo nano /etc/ssh/sshd_config
```

Ensure the following lines are set correctly (uncomment if necessary):
```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart the SSH service:
```bash
sudo systemctl restart sshd
```

## 3. Configure the Firewall (UFW)
Ensure only expected ports are open to the world.

```bash
sudo apt install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```
*Note: Depending on your cloud provider (AWS/Oracle), you must also ensure the Cloud Provider's network security group / firewall allows these ports.*

## 4. Install Fail2Ban
Protect against brute-force SSH attacks by temporarily banning IPs that repeatedly fail to authenticate.

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 5. Immutable Infrastructure Discipline
**Do not manually patch application code on the server.** 
If you find a bug, fix it in source control, commit it, and let GitHub Actions deploy it. 
Treat the server as an ephemeral resource that can be blown away and rebuilt at any time from your Git repository and database backups. If you ssh into the server and run `nano backend/app/main.py`, you are doing it wrong. Accumulating hidden manual tweaks on the VM creates a "snowflake server" that cannot be easily migrated or recovered in a disaster scenario.
