#!/bin/bash

CURRENT_DIR="${PWD##*/}"
NAMESPACE="$CURRENT_DIR"

kubectl delete -f k8s/config.yaml --namespace=$NAMESPACE
kubectl delete -f k8s/deployment.yaml --namespace=$NAMESPACE
kubectl delete -f k8s/service.yaml --namespace=$NAMESPACE
kubectl delete -f k8s/ingress.yaml --namespace=$NAMESPACE