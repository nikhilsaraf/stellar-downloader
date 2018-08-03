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
echo "post-processing file: $file"

head -n 1 $file > $temp
grep "^-" $file | tail -n 1 | tr -d '-' >> $temp
tail -n $((`cat $file | wc -l` - 1)) $file | grep -v "^-" >> $temp
mv $temp $file
