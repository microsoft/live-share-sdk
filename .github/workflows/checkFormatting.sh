#!/bin/bash
cd ../..
npm run doctor
diff=`git diff`
if [ -z "$diff"  ]
then
echo "everything formatted"
exit 0
else
echo "formatting needed, please run 'npm run doctor'"
exit 1
fi
