const express = require('express')
const axios = require('axios')
const app = express()
const port = 3000
const bodyParser = require('body-parser');

//const EventSource = require('eventsource');

const esc = require("eventsource");

//app.use(bodyParser.urlencoded({ extended: true }));
//app.use(bodyParser.json());
//app.use(bodyParser.raw());
app.use(bodyParser.text({limit: '50mb', extended: true}));

const mmsURL = 'https://dsl-modelix.siginet.lu';

app.get('/', (req, res) => {
    //console.log("GET on /")
    axios
        .get(`${mmsURL}/`)
        .then(resMss => {
            const body = resMss.data as string
            //console.log("sending", body)
            res.status(200).send(body)
        })
        .catch(error => {
            console.error(error)
        })
})

app.get('/get/:key', (req, res) => {
    const key = req.param("key");
    //console.log("getting", key)
    axios
        .get(`${mmsURL}/get/${key}`)
        .then(resMss => {
            const body = resMss.data as string
            //console.log("sending", body)
            res.status(200).send(body)
        })
        .catch(error => {
            console.error(error)
        })
})

app.get('/getEmail', (req, res) => {
    axios
        .get(`${mmsURL}/getEmail`)
        .then(resMss => {
            const body = resMss.data as string
            //console.log("sending", body)
            res.status(200).send(body)
        })
        .catch(error => {
            console.error(error)
        })
})

app.put('/getAll', (req, res) => {
    const reqBody = req.body;
    //console.log("getAll", reqBody)
    axios
        .put(`${mmsURL}/getAll`, reqBody)
        .then(resMss => {
            const body = resMss.data as string
            //console.log("sending", body)
            res.status(200).send(body)
        })
        .catch(error => {
            console.error(error)
        })
})

app.put('/putAll', (req, res) => {
    const reqBody = req.body;
    //console.log("getAll", reqBody)
    axios
        .put(`${mmsURL}/putAll`, reqBody)
        .then(resMss => {
            const body = resMss.data as string
            //console.log("sending", body)
            res.status(200).send(body)
        })
        .catch(error => {
            console.error(error)
        })
})

app.post('/counter/clientId', (req, res) => {
    axios
        .post(`${mmsURL}/counter/clientId`)
        .then(resMss => {
            const body = (resMss.data as number).toString()
            //console.log("sending", body)
            res.status(200).send(body)
        })
        .catch(error => {
            console.error(error)
        })
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

function eventsHandler(request, response, next) {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    response.writeHead(200, headers);

    const key = request.param("key");

    const es = new esc(`${mmsURL}/subscribe/${key}`);

    const listener = function (event) {
        const type = event.type;
        // console.log("got event", event);
        if (type === "message") {
            response.write(`data: ${event.data}\n\n`);
        }
    };
    es.addEventListener('open', listener);
    es.addEventListener('message', listener);
    es.addEventListener('error', listener);
    es.addEventListener('result', listener);


    // const data = `data: ${JSON.stringify(facts)}\n\n`;
    //
    // response.write(data);
    //
    // const clientId = Date.now();
    //
    // const newClient = {
    //     id: clientId,
    //     response
    // };
    //
    // clients.push(newClient);

    request.on('close', () => {
        // console.log(`${clientId} Connection closed`);
        // clients = clients.filter(client => client.id !== clientId);
    });
}

app.get('/subscribe/:key', eventsHandler);

const router = express.Router();

router.use(function(req, res, next) {
    if (!req.route) {
        console.log("NOT FOUND", req.method, req.url)
        return next(new Error('404'));
    } else {
        console.log("FOUND");
    }
    next();
});

app.use(router);