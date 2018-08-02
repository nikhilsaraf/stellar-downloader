var stellar = require('stellar-sdk')

if (process.argv.length <= 2) {
    console.log("need to pass in the account as a command line argument");
    process.exit()
}

var account = process.argv[2]
var server = new stellar.Server('https://horizon.stellar.org');
var limit = 1;

var to_csv = function(arr) {
    s = ""
    for (var i = 0; i < arr.length; i++) {
        if (i != 0) {
            s += ",";
        }
        s += arr[i];
    }
    return s;
}

var tradesPrinter = function(t) {
    var last_cursor = "";
    t.records.forEach(function(r) {
        base_asset = r.base_asset_type == 'native' ? 'XLM' : r.base_asset_code + ":" + r.base_asset_issuer;
        counter_asset = r.counter_asset_type == 'native' ? 'XLM' : r.counter_asset_code + ":" + r.counter_asset_issuer;
        counterparty_account = r.counter_account == account ? r.base_account : r.counter_account;

        if (r.base_is_seller) {
            sell_asset = base_asset;
            sell_amount = r.base_amount;
            bought_asset = counter_asset;
            bought_amount = r.counter_amount;
        } else {
            sell_asset = counter_asset;
            sell_amount = r.counter_amount;
            bought_asset = base_asset;
            bought_amount = r.base_amount;
        }

        console.log(to_csv([r.ledger_close_time, bought_asset, bought_amount, sell_asset, sell_amount, counterparty_account]));
        last_cursor = r.paging_token;
    });

    if (last_cursor != '') {
        server.trades()
            .forAccount(account)
            .order("asc")
            .limit(limit)
            .cursor(last_cursor)
            .call()
            .then(tradesPrinter);
    }
}

server.loadAccount(account).then(function(a) {
    console.log('Trades for account: ' + account);
    console.log('date,bought_asset,bought_amount,sell_asset,sell_amount,counterparty_account')
    server.trades()
        .forAccount(account)
        .order("asc")
        .limit(limit)
        .call()
        .then(tradesPrinter);
});
