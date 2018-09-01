#!/bin/bash

# script to run for all the accounts in a markets.csv file that includes price feeds for each asset
# depends on having https://github.com/nikhilsaraf/stellar-go/tree/master/test_secret installed as a binary on the machine
# this dependence can be avoided by using a file that replaces the secret keys with accounts (and updating this script accordingly)

if [[ $# -ne 1 ]]
then
    echo "Usage: $0 filename_markets.csv"
    exit 1
fi

date
xlm_price=`curl -s "https://api.coinmarketcap.com/v1/ticker/stellar/" | grep price_usd | cut -d '"' -f4`
echo "using XLM price (quoted in USD): \$$xlm_price"
echo ""

# input $1 is the filename for the markets.csv file
cat $1 | grep -v "#" | while IFS=, read code issuer name trader_secret source_secret spread strategy feed_type feed_token liquidity_depth extra
do
    ACCOUNT=`test_secret <<< $trader_secret | grep address | cut -d':' -f2 | tr -d ' '`

    echo "fetching price for \"$code:$issuer\" ..."
    if [[ $feed_type == "crypto" ]]
    then
        token_price=`curl -s "https://api.coinmarketcap.com/v1/ticker/$feed_token/" | grep price_usd | cut -d '"' -f4`
        echo "    ... fetched token price (quoted in USD) for \"$code:$issuer\": \$$token_price"
    elif [[ $feed_type == "fiat" ]]
    then
        # TODO
        token_price=1
    fi

    echo "downloading for account: $ACCOUNT ..."
    node trades.js $ACCOUNT "{\"XLM\":$xlm_price, \"$code:$issuer\": $token_price}" > "$ACCOUNT.csv"
    RESULT=$?
    if [[ $RESULT -ne 0 ]]
    then
        echo "    ... error while downloading for account $ACCOUNT, error code: $RESULT"
        exit $RESULT
    fi
    echo "    ... finished downloading for account: $ACCOUNT"

    echo "post processing file: $ACCOUNT.csv ..."
    ./postProcess.sh $ACCOUNT
    RESULT=$?
    if [[ $RESULT -ne 0 ]]
    then
        echo "    ... error while post processing for account ACCOUNT, error code: $RESULT"
        exit $RESULT
    fi
    echo "    ... finished post processing for account: $ACCOUNT"

    echo ""
done




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
