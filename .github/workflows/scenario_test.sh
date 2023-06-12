#!/bin/bash
RET=""
npm run start & 
success=0
tries=5
pause=30
while [ $success = 0 -a $tries -gt 0 ]; do
    sleep $pause
    let tries=tries-1
    npm run test 1>logs 2>results &
    RET=$(cat results | grep "Tests:" | tail -f -n 1)
    if [[ "$RET" != *"failed"* ]]; then
        success=1
    fi
done
if [ $success = 0 ]; then
    echo $(RET) >&2
    exit 1
else
    echo "success" >&2
fi
