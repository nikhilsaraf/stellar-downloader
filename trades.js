var stellar = require('stellar-sdk')

if (process.argv.length <= 2) {
    console.log("need to pass in the account as a command line argument");
    process.exit()
}

var account = process.argv[2]
var server = new stellar.Server('https://horizon.stellar.org');
var limit = 200;

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
        if (r.type != 'trade') {
            last_cursor = r.paging_token;
            return;
        }

        bought_asset = r.bought_asset_type == 'native' ? 'XLM' : r.bought_asset_code + ":" + r.bought_asset_issuer;
        sold_asset = r.sold_asset_type == 'native' ? 'XLM' : r.sold_asset_code + ":" + r.sold_asset_issuer;

        console.log(to_csv([r.created_at, bought_asset, r.bought_amount, sold_asset, r.sold_amount, r.seller]));
        last_cursor = r.paging_token;
    });

    if (last_cursor != '') {
        server.effects()
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
    server.effects()
        .forAccount(account)
        .order("asc")
        .limit(limit)
        .call()
        .then(tradesPrinter);
});
