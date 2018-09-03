#!/bin/bash

# script to consolidate the accounts csv files passed in as parameters into a single csv file representing the full portfolio

if [[ $# -lt 1 ]]
then
    echo "Usage: $0 account [account ...]"
    exit 1
fi

OUTPUT=portfolio.csv
echo -n "" > $OUTPUT
OUTPUT_TEMP=portfolio-temp.csv

for ACCOUNT in $@
do
    if [[ $ACCOUNT == *.* ]]; then
        echo "skipping account $ACCOUNT, only use account, not filename"
        continue
    fi

    echo "appending data for account $ACCOUNT"
    FILE=$ACCOUNT.csv
    tail -n +2 $FILE | cut -d',' -f2,3,9,10 | xargs -I {} echo "$ACCOUNT,{}" >> $OUTPUT
    echo "    ... finished appending data for account $ACCOUNT"
    echo ""
done

echo "consolidating files ..."
echo "account,paging_token,date,portfolio_value_xlm,portfolio_value_usd" > $OUTPUT_TEMP
cat $OUTPUT | sort -k2 -t, >> $OUTPUT_TEMP
mv $OUTPUT_TEMP $OUTPUT
echo "   ... finished consolidating files"
echo "done: $OUTPUT"
