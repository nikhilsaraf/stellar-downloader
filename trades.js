var stellar = require('stellar-sdk')

if (process.argv.length <= 2) {
    printDisplay("need to pass in the account as a command line argument");
    process.exit()
}

var account = process.argv[2]
var server = new stellar.Server('https://horizon.stellar.org');
var limit = 200;

var header = ['type','paging_token','date','bought_asset','bought_amount','sell_asset','sell_amount','counterparty_account']
var asset_map = {};
var asset_list = [];

var to_csv = function(arr) {
    s = ""
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] != null) {
            s += arr[i];
        }
        s += ",";
    }
    return s;
}

var printDisplay = function(str) {
    console.error(str);
}

var writeHistory = function(str) {
    console.log(str);
}

var register = function(a) {
    if (!(a in asset_map)) {
        asset_map[a] = 1;
        asset_list.push(a);
        header.push(a);
        printDisplay("");
        printDisplay(to_csv(header));
    }
}

var tradesPrinter = function(t) {
    var last_cursor = "";
    t.records.forEach(function(r) {
        if (r.type == 'account_created') {
            writeHistory(to_csv(['starting_balance', r.paging_token, r.created_at, 'XLM', r.starting_balance,null,null, r.account]));
        }

        if (r.type != 'trade') {
            last_cursor = r.paging_token;
            return;
        }

        bought_asset = r.bought_asset_type == 'native' ? 'XLM' : r.bought_asset_code + ":" + r.bought_asset_issuer;
        sold_asset = r.sold_asset_type == 'native' ? 'XLM' : r.sold_asset_code + ":" + r.sold_asset_issuer;
        register(bought_asset)
        register(sold_asset)

        var line = ['trade', r.paging_token, r.created_at, bought_asset, r.bought_amount, sold_asset, r.sold_amount, r.seller];
        for (i = 0; i < asset_list.length; i++) {
            if (bought_asset == asset_list[i]) {
                line.push(r.bought_amount);
            } else if (sold_asset == asset_list[i]) {
                line.push(-r.sold_amount);
            } else {
                line.push(null);
            }
        }
        writeHistory(to_csv(line));
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
    writeHistory('Trades for account: ' + account);
    writeHistory(to_csv(header));
    server.effects()
        .forAccount(account)
        .order("asc")
        .limit(limit)
        .call()
        .then(tradesPrinter);
});
