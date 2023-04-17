const WebSocket = require("ws");
require("dotenv").config();
const fs = require('fs');

const accounts = [];

const api = require("./api");

async function loadAccounts() {
    const { listenKey } = await api.connectAccount();
    console.log(`ListenKey obtained/updated: ${listenKey}`);

    let i = 1;
    while (process.env[`TRADER${i}_API_KEY`]) {
        accounts.push({
            apiKey: process.env[`TRADER${i}_API_KEY`],
            apiSecret: process.env[`TRADER${i}_API_SECRET`],
            slice: process.env[`TRADER${i}_SLICE_AMOUNT`],
            pairs: process.env[`TRADER${i}_PAIRS`]
        })
        i++;
    }
    console.log(`${i - 1} copy accounts loaded`);

    return listenKey;
}

function copyTrade(trade) {

    const data = {
        symbol: trade.s,
        side: trade.S,
        type: trade.o
    }

    if (trade.q && parseFloat(trade.q))
        data.quantity = trade.q;

    if (trade.p && parseFloat(trade.p))
        data.price = trade.p

    if (trade.f && trade.f !== "GTC")
        data.timeInForce = trade.f;

    if (trade.sp && parseFloat(trade.sp))
        data.stopPrice = trade.sp;

    if (trade.Q && parseFloat(trade.Q))
        data.quoteOrderQty = trade.Q;

    return data;
}

function log_to_file(data, file_name = 'original_trades') {

    // GET file
    const file = JSON.parse(fs.readFileSync('tmp/' + file_name + '.json'));
    // Find number of console.logs already there
    let lognumb = -1, cont = true;
    while (cont) {
        if (!(file[lognumb + 1] === undefined)) {
            lognumb++;
            continue
        };
        cont = false
    };
    file[lognumb + 1] = data;
    fs.writeFileSync("tmp/" + file_name + '.json', JSON.stringify(file));
}

// function writeToFile(trade) {


//     fs.appendFile("tmp/original_trades.json", JSON.stringify(trade),  {'flag':'a'}, function(err) {
//         if(err) {
//             return console.log(err);
//         }
//         console.log("new trade detected:");
//         console.log(trade);
//     }); 
// }

// function simulateTrade(data) {


//     fs.appendFile("tmp/trades.txt", JSON.stringify(data),  {'flag':'a'}, function(err) {
//         if(err) {
//             return console.log(err);
//         }
//         console.log("copy trade created:");
//         console.log(data);
//     }); 
// }

const oldOrders = {};

async function start() {
    const listenKey = await loadAccounts();

    const ws = new WebSocket(`${process.env.BINANCE_WS_URL}/${listenKey}`);

    //log_to_file({1:256}, 'original_trades');
    // log_to_file({1:256}, 'original_trades');
    // log_to_file({2:256856}, 'open_trades');
    // log_to_file({2:256856}, 'open_trades');

    ws.onmessage = async (event) => {
        console.log('new message:');
        try {
            const trade = JSON.parse(event.data);
            if (trade.e === "ORDER_TRADE_UPDATE" && !oldOrders[trade.o.c]) {
                // if (trade.e === "ORDER_TRADE_UPDATE") {
                oldOrders[trade.o.c] = true;

                // console.clear();
                // console.log(trade);
                log_to_file(trade, 'original_trades');

                const data = copyTrade(trade);
                log_to_file(data, 'open_trades');
                const promises = accounts.map(acc => api.newOrder(data, acc.apiKey, acc.apiSecret, acc.slice, acc.pairs));
                const results = await Promise.allSettled(promises);
                log_to_file(results, 'binance_trades');

                //para não entrar em loop durante os testes, descomente abaixo
                //process.exit(0);
            } else {
                console.log('isnt order update:');
                console.log(trade);
            }
        }
        catch (err) {
            console.error(err);
        }
    }

    console.log("Waiting trades...");

    setInterval(() => {
        api.connectAccount();
    }, 59 * 60 * 1000)
}

start();