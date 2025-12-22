
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/inventory/export',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers, null, 2));

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('BODY LENGTH: ' + data.length);
        console.log('BODY START: ' + data.substring(0, 200));
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
