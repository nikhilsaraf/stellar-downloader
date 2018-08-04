# Stellar Downloader

Download trades and payment data from the Stellar blockchain network as a CSV file for accounting purposes.

## Table of Contents

* [How it Works](#how-it-works)
* [Output](#output)
* [Getting Started](#getting-started)
   * [Set Up](#set-up)
   * [How to Run (Basic)](#how-to-run-basic)
   * [How to Run (Advanced)](#how-to-run-advanced)
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

    node trades GA...

You can redirect **stdout** and **stderr** to files as desired. See the [How to Run (Advanced) section below for more details](#how-to-run-advanced).

### How to Run (Advanced)

This process will allow you to [**spider**](https://en.wikipedia.org/wiki/Web_crawler) an account, i.e. you can pull data from the initial account as well as all accounts created by the initial account. This will create `N` files, _1 per account_.

1. create a new file called `newAccounts.txt` with the initial account you want to start with on the first line as follows (replace `GA...` with your account):
    ```
    new account: GA....
    ```
2. run the bash script `runForAccounts.sh` as follows:
    ```shell
    ./runForAccounts.sh newAccounts.txt
    ```

## Questions

Please feel free to ask questions by opening an issue or to contribute to the code using a Pull Request.
