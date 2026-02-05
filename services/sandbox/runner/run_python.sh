#!/bin/bash
set -e
timeout 10 python3 /sandbox/code/solution.py < /sandbox/code/stdin.txt 2>&1 || exit $?
