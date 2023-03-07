#!/bin/bash
echo "$PWD"
npm run build
npm run start & 
success=0
   tries=5
   pause=1
   while [ $success = 0 -a $tries -gt 0 ]; do
     sleep $pause
     let tries=tries-1
     yarn test && success=1
   done
   if [ $success = 0 ]; then
     echo "run failed"
   fi
