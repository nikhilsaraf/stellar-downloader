#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 file_with_accounts"
    exit 1
fi

cat $1 | grep "^new" | while IFS='' read -r line
do
    ACCOUNT=`echo $line | cut -d' ' -f3`
    date

    echo "downloading for account: $ACCOUNT ..."
    node trades.js $ACCOUNT nil > "$ACCOUNT.csv" 2>>$1
    echo "    ... finished downloading for account: $ACCOUNT"

    echo "post processing file: $ACCOUNT.csv ..."
    ./postProcess.sh $ACCOUNT
    echo "    ... finished post processing for account: $ACCOUNT"

    echo ""
done
