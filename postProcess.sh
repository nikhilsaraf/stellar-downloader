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

#head -n 1 $file > $temp
head -n 2 $file | tail -n 1 > $temp
headerCommas=`head -n 2 $file | tail -n 1 | awk -F"," '{print NF-1}'`
echo "number of commas = $headerCommas"
lineNumber=0; while IFS='' read -r line || [[ -n "$line" ]]; do lineNumber=$lineNumber+1; if [[ $lineNumber -gt 2 ]]; then lineCommas=`awk -F"," '{print NF-1}' <<< $line`; newCommas=$(($headerCommas-$lineCommas)); echo -n $line >> $temp; while [[ $newCommas -gt 0 ]]; do echo -n "," >> $temp; newCommas=$newCommas-1; done; echo "" >> $temp; fi; done < $file
mv $temp $file