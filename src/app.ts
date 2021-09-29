import {loadConfiguration} from "./configuration";

const express = require('express')
const axios = require('axios')
const app = express()
const port = 3000
const bodyParser = require('body-parser');

import {Request, Response} from 'express';
const esc = require("eventsource");
app.use(bodyParser.text({limit: '50mb', extended: true}));

const configuration = loadConfiguration()

/**
 * Verify if the request has a valid token.
 */
async function validateRequest(req: Request, res: Response, reqProcessing: (req, res) => void) {
    const authorizationHeader = req.header("Authorization")
    if (authorizationHeader == null || !(authorizationHeader.startsWith("Bearer "))) {
        res.status(403)
        return
    }
    const token = authorizationHeader.substr("Bearer ".length)
    const isTokenValid = await configuration.tokenValidator.checkToken(token)
    if (isTokenValid) {
        reqProcessing(req, res)
    } else {
        res.status(403)
    }
}

async function forwardRequest(req: Request, res: Response) {
    const forwardURL = `${configuration.mmsURL}${req.path}`
    if (req.method === 'GET') {
        axios
            .get(forwardURL)
            .then(resMss => {
                const body = resMss.data as string
                res.status(200).send(body)
            })
            .catch(error => {
                console.error(error)
            })
    } else if (req.method === 'PUT') {
        axios
            .put(forwardURL)
            .then(resMss => {
                const body = resMss.data as string
                res.status(200).send(body)
            })
            .catch(error => {
                console.error(error)
            })
    } else if (req.method === 'POST') {
        axios
            .post(forwardURL)
            .then(resMss => {
                const body = resMss.data as string
                res.status(200).send(body)
            })
            .catch(error => {
                console.error(error)
            })
    } else {
        throw new Error(`Unsupported method ${req.method}`)
    }
}

app.use((req,res,next)=>{
    // This is treated specially as SSE are a bit different, as far as I understand
    if (req.path.startsWith("/subscribe/")) {
        next()
    } else {
        validateRequest(req, res, (req, res) => forwardRequest(req, res))
    }
})

app.listen(port, () => {
    console.log(`MPS Auth Proxy listening at http://localhost:${port}`)
})

function eventsHandler(request, response, next) {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    response.writeHead(200, headers);

    const key = request.param("key");

    const es = new esc(`${configuration.mmsURL}/subscribe/${key}`);

    const listener = function (event) {
        const type = event.type;
        if (type === "message") {
            response.write(`data: ${event.data}\n\n`);
        }
    };
    es.addEventListener('open', listener);
    es.addEventListener('message', listener);
    es.addEventListener('error', listener);
    es.addEventListener('result', listener);

    request.on('close', () => {

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