#!/bin/bash

set -ex
set -a

REGISTRY="890606282206.dkr.ecr.eu-west-1.amazonaws.com"

CURRENT_DIR="${PWD##*/}"
IMAGE_NAME="$CURRENT_DIR"
if [[ -z "${LATEST_VERSION}" ]]; then
  LATEST_VERSION=$(aws ecr list-images --repository-name $IMAGE_NAME \
  | jq '.imageIds|map(.imageTag)|.[]|strings' \
  | sort -rV \
  | head -1)
  VERSION=$(echo $VERSION | tr -d \")
fi

VERSION="${LATEST_VERSION:-1.0.0}"
VERSION=$(echo $VERSION | tr -d \")

INCREASE=${1:-m}

TAG="$(./increment_version.sh -${INCREASE} ${VERSION})"

FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"

if [ $2 = "prod" ] ; then
  MAX_SURGE="
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1"
fi

# login to docker registery
$(aws ecr get-login --no-include-email)

docker build -t ${IMAGE_NAME} .
docker tag ${IMAGE_NAME}:latest ${REGISTRY}/${IMAGE_NAME}:${TAG}
docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}

export FULL_IMAGE_NAME="$FULL_IMAGE_NAME"
export NAME="$CURRENT_DIR"

echo "${FULL_IMAGE_NAME}" > k8s/image-name

rm -f k8s/deployment.yaml k8s/temp.yaml  
( echo "cat <<EOF >k8s/deployment.yaml";
  cat k8s/deployment.yaml.template;
) >temp.yaml
. temp.yaml
cat k8s/deployment.yaml
rm -f temp.yaml