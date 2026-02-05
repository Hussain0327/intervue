#!/bin/bash
set -e
timeout 10 node /sandbox/code/solution.js < /sandbox/code/stdin.txt 2>&1 || exit $?
