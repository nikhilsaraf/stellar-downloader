# Stellar Downloader

Download trades and payment data from the Stellar blockchain network as a CSV file for accounting purposes.

## Table of Contents

* [How it Works](#how-it-works)
* [Output](#output)
* [Getting Started](#getting-started)
   * [Set Up](#set-up)
   * [How to Run (Basic)](#how-to-run-basic)
   * [How to Run (Advanced I)](#how-to-run-advanced-i)
   * [How to Run (Advanced II)](#how-to-run-advanced-ii)
* [Questions](#questions)

## How it Works

Stellar Downloader uses [_Node_](https://nodejs.org/) and the [_Stellar Javascript SDK_](https://github.com/stellar/js-stellar-sdk) to pull `payments` and `effects` from **Horizon**.

It uses the **/effects endpoint** to get all `payments` and `trades`, ordering them by the `paging_token` in _ascending order_.

It uses the **/payments endpoint** to fill in data that is unavailable from the **/effects endpoint** such as the initial `funder` of an account or the counterparty of a payment.

Everytime it encounters a new _trustline_, it adds it to the list of headers and prints out the headers to _stdout_. From that point on, it always prints the _cumulative balance_ of that asset in a new column on the right. In this manner, you will always have the latest balance for _all assets_ on each row in CSV format.

_Note: This script will not include any **fees** paid by the account, and as such, balances for **XLM** may be slightly off_.

## Output

This is what the script outputs:
- trades and payments to `stdout` in CSV format.
- column headers to `stdout` in CSV format. It prefixes headers with `-` so it can be removed using `grep` in the bash script. See the [How to Run (Advanced) section for more details](#how-to-run-advanced).
- new accounts to `stderr`.

_Note: This script will not include any `path_payments` made by the account at this point in time, although you can easily update the script to include this_.

_Note: This script will not include any **fees** paid by the account, and as such, balances for **XLM** may be slightly off_.

## Getting Started

### Set Up

1. You can clone the repo by running the following command:
    ```shell
    git clone git@github.com:nikhilsaraf/stellar-downloader.git
    ```
2. Make sure you install [Node.js](https://nodejs.org/)
3. Set up the [Stellar Javascript SDK](https://github.com/stellar/js-stellar-sdk) by installing it from [npm](https://www.npmjs.com/):
    ```shell
    npm install --save stellar-sdk
    ```

### How to Run (Basic)

Run the trades.js script for your account (replace `GA...` with your account):

    node trades.js GA...

You can redirect **stdout** and **stderr** to files as desired. See the [How to Run (Advanced) section below for more details](#how-to-run-advanced).

### How to Run (Advanced I)

This process will allow you to [**spider**](https://en.wikipedia.org/wiki/Web_crawler) an account, i.e. you can pull data from the initial account as well as all accounts created by the initial account. This will create `N` files, _1 per account_. Note the script will modify your input file, so be careful if you run it more than once.

1. create a new file called `newAccounts.txt` with the initial account you want to start with on the first line as follows (replace `GA...` with your account):
    ```
    new account: GA....
    ```
2. run the bash script `spiderAccounts.sh` as follows:
    ```shell
    ./spiderAccounts.sh newAccounts.txt
    ```

### How to Run (Advanced II)

This process will allow you to run the downloader script for all your market making accounts in a single command and the output files will include the portfolio balances in XLM and USD using a reference price provided by you in the input file. This will **not** _spider_ any of the accounts and will **not** modify your original file.

1. create a new file called `markets.csv` detailing all your accounts using the following columns (no header line):

    - code: the asset_code on the stellar network
    - issuer: the issuer's address
    - name: any friendly name you want to assign to the token or issuer
    - trader_secret: this will be converted to your trader account, this depends on the [test_secret script](https://github.com/nikhilsaraf/stellar-go/tree/master/test_secret), see `runForMarketsCsv.sh` for more information.
    - blank: make sure to leave an empty value here
    - blank: make sure to leave an empty value here
    - blank: make sure to leave an empty value here
    - feed_type: crypto or fiat; takes the reference price from [coinmarketcap](https://coinmarketcap.com/) and [currencylayer](https://currencylayer.com/) accordingly
    - feed_token: USD / bitcoin / ethereum / etc.; see [coinmarketcap](https://coinmarketcap.com) and [currencylayer](https://currencylayer.com/) for the values to use here
    - blank: make sure to leave an empty value here

2. set the `CURRENCY_LAYER_API_TOKEN`, you can use a .env file to do this, like so (replace `...` with your token):
    ```shell
    export CURRENCY_LAYER_API_TOKEN=...
    ```

3. run the bash script `runForMarketsCsv.sh` as follows:
    ```shell
    ./runForMarketsCsv.sh markets.csv
    ```

## Questions

Please feel free to ask questions by opening an issue or to contribute to the code using a Pull Request.
