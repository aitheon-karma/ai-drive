#!/bin/bash

set -ex
# build and push image to registery
./build.sh ${s1}

FULL_IMAGE_NAME=$(<k8s/image-name)
CURRENT_DIR="${PWD##*/}"
IMAGE_NAME="$CURRENT_DIR"
NAMESPACE="$CURRENT_DIR"
kubectl set image deployment/$IMAGE_NAME $IMAGE_NAME=${FULL_IMAGE_NAME} --namespace=$NAMESPACE