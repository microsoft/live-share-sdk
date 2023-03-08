#!/bin/bash
RET=""
npm run start & 
success=0
tries=5
pause=30
while [ $success = 0 -a $tries -gt 0 ]; do
    sleep $pause
    let tries=tries-1
    yarn test 1>logs 2>results &
    RET=$(cat results | grep "Tests:" | tail -f -n 1)
    if [[ "$RET" != *"failed"* ]]; then
        success=1
    fi
done
if [ $success = 0 ]; then
    echo "failed" >&2
    exit 1
else
    echo "sucess" >&2
fi
