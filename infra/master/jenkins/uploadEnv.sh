#!/bin/bash

CREDENTIALS_FILE="${JENKINS_CREDENTIALS_FILE:-infra/master/jenkins/credentials.sh}"
if [ -f "$CREDENTIALS_FILE" ]; then
    source "$CREDENTIALS_FILE"
fi
REPO_NAME="${JENKINS_SECRET_REPO_NAME:-${REPO_NAME:-}}"
SECRET_USER="${JENKINS_SECRET_SSH_USER:-${SECRET_USER:-}}"
SECRET_HOST="${JENKINS_SECRET_SSH_HOST:-${SECRET_HOST:-}}"
SECRET_PORT="${JENKINS_SECRET_SSH_PORT:-${SECRET_PORT:-22}}"

if [ -z "$REPO_NAME" ] || [ -z "$SECRET_USER" ] || [ -z "$SECRET_HOST" ]; then
    echo "Missing Jenkins secret storage credentials. Copy infra/master/jenkins/credentials.example.sh to infra/master/jenkins/credentials.sh and fill it in." >&2
    exit 1
fi

SECRET_MAP=$(infra/master/jenkins/getEnvs.sh)

ssh -o StrictHostKeyChecking=no "$SECRET_USER@$SECRET_HOST" -p "$SECRET_PORT" "chmod 777 -R ~/secrets"
for SECRET in ${SECRET_MAP[@]}; do
    IFS=',' read -ra DATA <<< $SECRET
    FILE_PATH=${DATA[0]}
    SECRET_ID=${DATA[1]}
    ENV_TYPE=${DATA[2]}
    if [ -z "$ENV_TYPE" ]
    then
        DAT=($FILE_PATH)
        FILE_PATH=${DAT[0]}
        SECRET_ID=${DAT[1]}
        ENV_TYPE=${DAT[2]}
    fi
    DIRNAME=$(dirname "$FILE_PATH")
    FILENAME=$(basename "$FILE_PATH")
    ssh -o StrictHostKeyChecking=no "$SECRET_USER@$SECRET_HOST" -p "$SECRET_PORT" "mkdir -p ~/secrets/$REPO_NAME/$DIRNAME"
    scp -o StrictHostKeyChecking=no -rp -P "$SECRET_PORT" "$FILE_PATH" "$SECRET_USER@$SECRET_HOST:~/secrets/$REPO_NAME/$FILE_PATH"
    echo "${SECRET_ID} Upload Completed"
done