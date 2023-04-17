const axios = require('axios');
const crypto = require('crypto');

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

async function newOrder(data, apiKey, apiSecret,slice, pairs) {
    console.log('enter in create order function');
    if (!apiKey || !apiSecret)
        throw new Error('Preencha corretamente sua API KEY e SECRET KEY');

    const pairs_array = pairs.split(',');
    data.quantity = data.quantity * slice;
    if(!pairs_array.includes(data.symbol)) {
        console.log('pair is out of allowed pairs');
        return;
    }
    console.log('order created on binance of !!'+data.quantity);

    // data.timestamp = Date.now();
    // data.recvWindow = 60000;//máximo permitido, default 5000

    // const signature = crypto
    //     .createHmac('sha256', apiSecret)
    //     .update(`${new URLSearchParams(data)}`)
    //     .digest('hex');

    // const qs = `?${new URLSearchParams({ ...data, signature })}`;

    // try {
    //     const result = await axios({
    //         method: "POST",
    //         url: `${apiUrl}/v1/order${qs}`,
    //         headers: { 'X-MBX-APIKEY': apiKey }
    //     });
    //     return result.data;
    // } catch (err) {
    //     console.error(err.response ? err.response : err);
    // }
}

module.exports = { newOrder, connectAccount }