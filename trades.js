var stellar = require('stellar-sdk')

if (process.argv.length <= 2) {
    printDisplay("need to pass in the account as a command line argument");
    process.exit()
}

var account = process.argv[2]
var server = new stellar.Server('https://horizon.stellar.org');
var limit = 200;
var stroops_in_unit = 10000000.0;

var header = ['type','paging_token','date','bought_asset','bought_amount','sell_asset','sell_amount','counterparty_account','XLM']
var asset_map = {'XLM' : 0};
var asset_list = ['XLM'];
// payment, account_created, and account_merge type payments keyed by paging_token
var payments = {};

var to_csv = function(arr) {
    s = "";
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

var register = function(a, start_amount) {
    if (!(a in asset_map)) {
        asset_map[a] = start_amount;
        asset_list.push(a);
        header.push(a);
        writeHistory("-" + to_csv(header));
    }
}

var recordPayment = function(r) {
    if (r.type == 'create_account') {
        payments[r.paging_token] = {
            type: r.type,
            account: r.account,
            funder: r.funder,
            starting_balance: r.starting_balance
        };
    } else if (r.type == 'payment') {
        asset = r.asset_type == 'native' ? 'XLM' : r.asset_code + ":" + r.asset_issuer;
        payments[r.paging_token] = {
            type: r.type,
            from: r.from,
            to: r.to,
            asset: asset,
            amount: r.amount
        };
    } else if (r.type == 'account_merge') {
        payments[r.paging_token] = {
            type: r.type,
            account: r.account,
            into: r.into
        };
    } else {
        throw {
            "message": "invalid payment type: " + r.type,
            "is_create_account": r.type == 'create_account',
            "is_payment": r.type == 'payment',
            "is_account_merge": r.type == 'account_merge',
            "operation": r
        };
    }
}

var paymentsHandler = function(t) {
    var last_cursor = "";
    t.records.forEach(function(r) {
        recordPayment(r);
        last_cursor = r.paging_token;
    });

    if (last_cursor != '') {
        server.payments()
            .forAccount(account)
            .order("asc")
            .limit(limit)
            .cursor(last_cursor)
            .call()
            .then(paymentsHandler)
    }
}

var appendAssets = function(list) {
    for (var i = 0; i < asset_list.length; i++) {
        value = asset_map[asset_list[i]]
        list.push(value/stroops_in_unit);
    }
}

var mapData = async function(effect_paging_token) {
    payment_pt = effect_paging_token.split("-")[0];
    if (payment_pt in payments) {
        return payments[payment_pt];
    }

    await server.operations()
        .operation(payment_pt)
        .call()
        .then(recordPayment)
    return payments[payment_pt];
}

var tradesPrinter = async function(t) {
    var last_cursor = "";
    for (var i = 0; i < t.records.length; i++) {
        r = t.records[i];
        last_cursor = r.paging_token;
        var line = [];
        if (r.type == 'account_created') {
            // only applies to the current account being created
            m_data = await mapData(r.paging_token);
            line = ['genesis', r.paging_token, r.created_at, 'XLM', r.starting_balance, null, null, m_data.funder];
            asset_map['XLM'] += Math.round(parseFloat(r.starting_balance) * stroops_in_unit);
        } else if (r.type == 'account_debited') {
            m_data = await mapData(r.paging_token);
            if (m_data.type == 'payment') {
                line = ['payment_sent', r.paging_token, r.created_at, null, null, m_data.asset, r.amount, m_data.to];
                asset_map[m_data.asset] -= Math.round(parseFloat(r.amount) * stroops_in_unit);
            } else if (m_data.type == 'create_account') {
                line = ['account_created', r.paging_token, r.created_at, null, null, 'XLM', m_data.starting_balance, m_data.account];
                asset_map['XLM'] -= Math.round(parseFloat(m_data.starting_balance) * stroops_in_unit);
                printDisplay("new account: " + m_data.account);
            } else if (m_data.type == 'account_merge') {
                line = ['payment_sent', r.paging_token, r.created_at, null, null, 'XLM', r.amount, m_data.into];
                asset_map['XLM'] -= Math.round(parseFloat(r.amount) * stroops_in_unit);
            } 
        } else if (r.type == 'account_credited') {
            m_data = await mapData(r.paging_token);
            if (m_data.type == 'payment') {
                line = ['payment_received', r.paging_token, r.created_at, m_data.asset, r.amount, null, null, m_data.from];
                asset_map[m_data.asset] += Math.round(parseFloat(r.amount) * stroops_in_unit);
            } else if (m_data.type == 'account_merge') {
                line = ['payment_received', r.paging_token, r.created_at, 'XLM', r.amount, null, null, m_data.account];
                asset_map['XLM'] += Math.round(parseFloat(r.amount) * stroops_in_unit);
            } else {
                // it is never the case that effect is account_credited and operation is created_account (that's why we have the account_created effect)
                throw { 'operation': m_data, 'effect': r };
            }
        } else if (r.type == 'trade') {
            bought_asset = r.bought_asset_type == 'native' ? 'XLM' : r.bought_asset_code + ":" + r.bought_asset_issuer;
            sold_asset = r.sold_asset_type == 'native' ? 'XLM' : r.sold_asset_code + ":" + r.sold_asset_issuer;
            line = ['trade', r.paging_token, r.created_at, bought_asset, r.bought_amount, sold_asset, r.sold_amount, r.seller];
            asset_map[bought_asset] += Math.round(parseFloat(r.bought_amount) * stroops_in_unit);
            asset_map[sold_asset] -= Math.round(parseFloat(r.sold_amount) * stroops_in_unit);
        } else if (r.type == 'account_removed') {
            line = ['end', r.paging_token, r.created_at, null, null, null, null, null];
        } else if (r.type == 'trustline_created') {
            asset = r.asset_code + ":" + r.asset_issuer;
            register(asset, 0);
            continue;
        } else {
            continue;
        }

        appendAssets(line);
        writeHistory(to_csv(line));
    }

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

    server.payments()
        .forAccount(account)
        .order("asc")
        .limit(limit)
        .call()
        .then(paymentsHandler)

    setTimeout(function() {
        server.effects()
            .forAccount(account)
            .order("asc")
            .limit(limit)
            .call()
            .then(tradesPrinter)
            .catch(function(e) {
                printDisplay('error:');
                printDisplay(e);
            });
    }, 1000);
});
