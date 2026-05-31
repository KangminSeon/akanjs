#!/bin/bash
SECRET_MAP=( \
"infra/master/bunkan-id,bunkan-id,general" \
"infra/master/bunkan-id.pub,bunkan-id-pub,general" \
"infra/master/kubeconfig.yaml,bunkan-kube-config,general" \
"infra/master/regcred.yaml,bunkan-kube-secret,general" \
"infra/master/jenkins/.jenkins.conf,bunkan-jenkins-conf,general" \
"infra/master/jenkins/credentials.sh,bunkan-jenkins-credentials,general" \
"infra/app/values/_common-secret.yaml,bunkan-common-secret,general" \
"infra/app/values/akan-secret.yaml,bunkan-akan-helm-secret,general" \
)
for SECRET in ${SECRET_MAP[@]}; do
    echo ${SECRET}
done
exit 0