#!/bin/bash
set -e
cd /sandbox/code
timeout 10 javac Solution.java 2>&1 || exit $?
timeout 10 java -cp /sandbox/code Solution < /sandbox/code/stdin.txt 2>&1 || exit $?
