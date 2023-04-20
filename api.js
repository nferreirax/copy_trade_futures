const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

const apiUrl = process.env.BINANCE_API_URL;

async function connectAccount() {
    const apiKey = process.env.TRADER0_API_KEY;
    const apiSecret = process.env.TRADER0_API_SECRET;
    const data = {};
    data.timestamp = Date.now();
    data.recvWindow = 60000;//máximo permitido, default 5000

    const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(`${new URLSearchParams(data)}`)
        .digest('hex');

    const qs = `?${new URLSearchParams({ ...data, signature })}`;

    if (!apiKey || !apiSecret)
        throw new Error('Preencha corretamente sua API KEY e SECRET KEY');
    try {
        const result = await axios({
            method: "POST",
            url: `${apiUrl}/v1/listenKey`,
            headers: { 'X-MBX-APIKEY': apiKey }
        });
        console.log(result.data);

        return result.data;
    } catch (err) {
        console.error(err.response ? err.response : err);
        process.exit(0);
    }
}

// function countDigits(value) {
//     if (value === 0) return { wholePlaces: 0, decimalPlaces: 0 };

//     var absValue = Math.abs(value); // -15.555 becomes 15.555
//     var wholePlaces = 0;
//     for (; wholePlaces <= 308; ++wholePlaces) { // Number.MAX_VALUE is 1.798e+308
//         if (absValue < Math.pow(10, wholePlaces))
//             break;
//     }

//     var decimalValue = absValue - Math.floor(absValue); // 15.555 - 15 = 0.555
//     var decimalPlaces = 0;
//     for (; decimalPlaces >= -323; --decimalPlaces) { // Number.MIN_VALUE is 5e-324
//         var temp = (decimalValue / Math.pow(10, decimalPlaces)) + 0.09; // Adding 0.09 to counter float errors
//         if (temp - Math.floor(temp) < 0.1)  // If the decimal remaining is smaller that 0.1, we've reached the end
//             break;
//     }
//     decimalPlaces = Math.abs(decimalPlaces);
//     // return {
//     //     wholePlaces,
//     //     decimalPlaces,
//     //   }
//     return wholePlaces;

// }

// function getDecimals(number) {

//     const wholePlaces = countDigits(number);
//     if (wholePlaces == 0) decimals = 4;
//     else if (wholePlaces > 0 && wholePlaces < 1000) decimals = 2;
//     else decimals = 0;
//     return decimals;

// }

async function newOrder(data, apiKey, apiSecret, slice, pairs) {
    try {
        console.log('enter in create order function');
        if (!apiKey || !apiSecret)
            throw new Error('Preencha corretamente sua API KEY e SECRET KEY');
        
        let data_original = data;
        const quantity_precision = await getMinNotionQuantity(data.symbol);

        // const pairs_array = pairs.split(',');
        const quantity = parseFloat(data_original.quantity * slice);
        data.quantity = quantity.toFixed(quantity_precision);

        // if(!pairs_array.includes(data.symbol)) {
        //     console.log('ALLOWED PAIRS '+JSON.stringify(pairs_array));
        //     console.log('pair is out of allowed pairs '+data.symbol);
        //     console.log('data '+JSON.stringify(data));
        //     return;
        // }
        console.log('order to be created on binance with qtd ' + data.quantity);

        data.timestamp = Date.now();
        data.recvWindow = 5000;//máximo permitido, default 5000


        const signature = crypto
            .createHmac('sha256', apiSecret)
            .update(`${new URLSearchParams(data)}`)
            .digest('hex');

        const qs = `?${new URLSearchParams({ ...data, signature })}`;

        try {
            console.log('try create order');
            const result = await axios({
                method: "POST",
                url: `${apiUrl}/v1/order${qs}`,
                headers: { 'X-MBX-APIKEY': apiKey }
            });
            console.log('order created!');
            log_to_file(result.data, 'open_orders')
            return result.data;
        } catch (err) {
            console.error(err.response ? err.response : err);
            log_to_file(err.response ? err.response : err, 'error')
        }
    } catch (err) {
        console.error(err.response ? err.response : err);
        log_to_file(err.response ? err.response : err, 'error')
    }
}

async function exchangeInfo() {
    console.log('enter in exchange info function');

    try {
        const result = await axios({
            method: "GET",
            url: `${apiUrl}/v1/exchangeInfo`,
            //headers: { 'X-MBX-APIKEY': apiKey }
        });
        return result.data;
    } catch (err) {
        console.error(err.response ? err.response : err);
        //log_to_file(err.response ? err.response : err,'error')
    }
}

async function getMinNotionQuantity(symbol) {

    let userToken = await exchangeInfo();
    data = userToken.symbols;
    //console.log(data) // your data

    const myKey = Object.keys(data).find(x => data[x].symbol === symbol);


    return data[myKey].quantityPrecision;
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



module.exports = { newOrder, connectAccount, exchangeInfo, getMinNotionQuantity }