#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 file_with_accounts"
    exit 1
fi

while IFS='' read -r line || [[ -n "$line" ]]; do if [[ $line == new* ]]; then F=`echo $line | cut -d' ' -f3`; node trades.js $F > "$F.csv" 2>>$1; fi; done < $1
