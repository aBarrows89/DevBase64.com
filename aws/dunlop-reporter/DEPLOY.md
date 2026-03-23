# Dunlop Sellout Reporter — AWS Deployment

## Prerequisites
- AWS CLI configured with appropriate credentials
- AWS SAM CLI installed (`brew install aws-sam-cli`)
- Docker (for building Lambda layers)

## Steps

### 1. Build the paramiko Lambda layer
```bash
cd aws/dunlop-reporter/layers/paramiko
./build.sh
```

### 2. Deploy with SAM
```bash
cd aws/dunlop-reporter
sam build
sam deploy --guided
```

On first deploy, SAM will prompt for:
- Stack name: `dunlop-reporter`
- Region: `us-east-1` (or your preferred region)
- Parameters: Stage, AlertEmail

### 3. Note the outputs
After deploy, note:
- **ApiUrl** — Set this as `DUNLOP_API_GATEWAY_URL` in IE Central's `.env.local`
- **ElasticIpAddress** — Send to Eusebio Castaneda for SFTP whitelist

### 4. Configure IE Central
Add to `.env.local`:
```
DUNLOP_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
```

### 5. Update SFTP credentials
After Eusebio provides prod credentials, update the secret in AWS Secrets Manager:
```bash
aws secretsmanager update-secret \
  --secret-id dunlop-reporter/sftp-credentials \
  --secret-string '{ "sftp_dev": { ... }, "sftp_prod": { "host": "landp.srnatire.com", "port": 22, "username": "ACTUAL", "password": "ACTUAL", "directory": "inbound" } }'
```

### 6. Enable monthly cron
After backfill is complete and prod is confirmed:
```bash
aws events enable-rule --name dunlop-monthly-report
```

## Open TODOs
- [ ] R10 zip confirmed as 15631 (Everson PA)
- [ ] Dunlop MFG ID confirmed as DUN in JMK
- [ ] Fanatic SKU exclusion list wired up
- [ ] NAT Gateway Elastic IP → Eusebio for whitelist
- [ ] Dev SFTP test → Eusebio confirmation
- [ ] Prod SFTP credentials from Eusebio
- [ ] CloudWatch alarm confirmed working
- [ ] All resources tagged Project: DunlopReporter
