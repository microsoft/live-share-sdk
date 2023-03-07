#!/bin/bash
npm run start & 
success=0
tries=5
pause=30
while [ $success = 0 -a $tries -gt 0 ]; do
    sleep $pause
    let tries=tries-1
    yarn test 1> logs 2> results &
    ret = tail -f -n 1 errs | grep "Test Suites:"
    echo $ret
    success=1
done
if [ $success = 0 ]; then
    echo "run failed"
fi
