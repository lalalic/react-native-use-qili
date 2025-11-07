#!/bin/bash

PATCHES_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PODS_DIR="$PATCHES_DIR/../../ios/Pods"


echo 'patch pod boost...'
cp -r "$PATCHES_DIR/boost/." "$PODS_DIR/boost"

echo '----end pod-patches---'

