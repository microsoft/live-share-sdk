#!/bin/bash
cd ../..
npm run doctor
diff=`git diff`
if [ -z "$diff"  ]
then
echo "everything formatted"
exit 0
echo "" # empty line
echo "" # empty line
echo "FORMATTING NEEDED"
echo "Please run 'npm run doctor'"
exit 1
fi
