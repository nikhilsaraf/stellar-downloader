#!/bin/bash

# master script that orchestrates all the other scripts to produce the relevant account and portfolio csv files

if [[ $# -ne 1 ]]
then
    echo "Usage: $0 filename_markets.csv"
    exit 1
fi

echo "running script: runForMarketsCsv.sh"
echo ""
./runForMarketsCsv.sh $1
RESULT=$?
if [[ $RESULT -ne 0 ]]
then
    echo "runForMarketsCsv.sh returned with an error: $RESULT"
    exit $RESULT
fi
echo ""
echo "... finished running script: runForMarketsCsv.sh"
echo ""
echo "-------------------------------------------------------------"
echo ""

echo "running script: consolidateAccountsCsv.sh"
echo ""
# TODO get this from the markets.csv file instead of from the listed files
ARRAY_INPUT=`ls | grep ^G | sed 's/.csv//'`
./consolidateAccountsCsv.sh $ARRAY_INPUT
RESULT=$?
if [[ $RESULT -ne 0 ]]
then
    echo "consolidateAccountsCsv.sh returned with an error: $RESULT"
    exit $RESULT
fi
echo ""
echo "... finished running script: consolidateAccountsCsv.sh"

echo ""
echo "BUILD SUCCESSFUL"
