var stellar = require('stellar-sdk')

var printDisplay = function(str) {
    console.error(str);
}

if (process.argv.length != 4) {
    printDisplay("Usage: node trades.js account price_map");
    printDisplay("price_map is code:issuer to price quoted in USD as a JSON formatted map, native XLM tokens should use \"XLM\" as the key");
    printDisplay("if you don't want portfolio data or don't have price data use 'nil' as the last param");
    process.exit()
}

var account = process.argv[2];
var priceFeedJsonString = process.argv[3];

var server = new stellar.Server('https://horizon.stellar.org');
var limit = 200;
var stroops_in_unit = 10000000.0;

var header = ['type','paging_token','date','bought_asset','bought_amount','sell_asset','sell_amount','counterparty_account'];
var asset_map = {'XLM' : 0};
if (priceFeedJsonString != "nil") {
    var price_map = JSON.parse(priceFeedJsonString);
    if (!('XLM' in price_map)) {
        printDisplay("error: 'XLM' is not in price map");
        process.exit()
    }
    header.push('portfolio_value_xlm');
    header.push('portfolio_value_usd');
}
header.push('XLM');
var asset_list = ['XLM'];
// payment, account_created, and account_merge type payments keyed by paging_token
var payments = {};

var to_csv = function(arr) {
    s = "";
    for (var i = 0; i < arr.length; i++) {
        if (i != 0) {
            s += ",";
        }
        if (arr[i] != null) {
            s += arr[i];
        }
    }
    return s;
}

var writeHistory = function(str) {
    console.log(str);
}

var handleError = function(e) {
    printDisplay('error:');
    printDisplay(e);
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
    } else if (r.type == 'inflation') {
        payments[r.paging_token] = {
            type: r.type,
            source_account: r.source_account
        }
    } else {
        throw {
            "message": "invalid payment type: " + r.type,
            "is_create_account": r.type == 'create_account',
            "is_payment": r.type == 'payment',
            "is_account_merge": r.type == 'account_merge',
            "is_inflation": r.type == 'inflation',
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
            .catch(handleError);
    }
}

var appendPortfolioValueAndAssets = function(list) {
    if (price_map) {
        var usd_value = 0;
        for (var i = 0; i < asset_list.length; i++) {
            if (!(asset_list[i] in price_map)) {
                printDisplay("error: '" + asset_list[i] + "' not in price_map, exiting");
                process.exit();
            }
            value = asset_map[asset_list[i]]
            usd_value += value * price_map[asset_list[i]]
        }
        var xlm_value = usd_value / price_map['XLM'];
        list.push(xlm_value/stroops_in_unit);
        list.push(usd_value/stroops_in_unit);
    }

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
        .catch(handleError);
    return payments[payment_pt];
}

var tradesPrinter = async function(t) {
    var last_cursor = "";
    for (var i = 0; i < t.records.length; i++) {
        r = t.records[i];
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
            } else if (m_data.type == 'inflation') {
                line = ['inflation', r.paging_token, r.created_at, 'XLM', r.amount, null, null, m_data.source_account];
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
        } else if (r.type.includes('signer')) {
            line = [r.type, r.paging_token, r.created_at, null, null, null, null, r.public_key];
        } else if (r.type == 'trustline_created') {
            asset = r.asset_code + ":" + r.asset_issuer;
            register(asset, 0);
            last_cursor = r.paging_token;
            continue;
        } else {
            last_cursor = r.paging_token;
            continue;
        }

        appendPortfolioValueAndAssets(line);
        writeHistory(to_csv(line));
        last_cursor = r.paging_token;
    }

    if (last_cursor != '') {
        server.effects()
            .forAccount(account)
            .order("asc")
            .limit(limit)
            .cursor(last_cursor)
            .call()
            .then(tradesPrinter)
            .catch(handleError);
    }
}

writeHistory("-" + to_csv(header));

server.payments()
    .forAccount(account)
    .order("asc")
    .limit(limit)
    .call()
    .then(paymentsHandler)
    .catch(handleError);

setTimeout(function() {
    server.effects()
        .forAccount(account)
        .order("asc")
        .limit(limit)
        .call()
        .then(tradesPrinter)
        .catch(handleError);
}, 1000);
