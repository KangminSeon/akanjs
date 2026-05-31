#!/bin/bash

prev_versions=$(docker images --format {{.Repository}}:{{.Tag}} | grep $1 | grep $2 | grep -v "$3\|live")
prev_count=$(echo ${prev_versions} | wc -w)
if [ $prev_count -gt 0 ] 
then
    echo "Clearing Mainfests..."
    echo ${prev_versions}
    docker rmi ${prev_versions} -f
else
    echo "No Manifests to Clear In Previous Versions"
fi
