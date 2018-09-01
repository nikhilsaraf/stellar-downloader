#!/bin/bash

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 account"
    exit 1
fi

if [[ $1 == *.* ]]; then
    echo "Usage: $0 account"
    exit 1
fi

file="$1.csv"
temp="$1-temp.csv"

HEADER=`grep "^-" $file | tail -n 1 | tr -d '-'`
HEADER_COMMAS=`echo "$HEADER" | awk -F"," '{print NF-1}'`
# write header
echo "$HEADER" > $temp
# write data after transforming the number of commas in each line to match that of the header
cat $file | grep -v "^-" | while IFS=, read -r LINE
do
    LINE_COMMAS=`awk -F"," '{print NF-1}' <<< $LINE`
    echo -n $LINE >> $temp
    while [[ $LINE_COMMAS -lt $HEADER_COMMAS ]]
    do
        echo -n "," >> $temp
        LINE_COMMAS=$(($LINE_COMMAS + 1))
    done
    echo "" >> $temp
done
mv $temp $file
