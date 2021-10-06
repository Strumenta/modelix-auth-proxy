import {Configuration, loadConfiguration} from "./configuration";

import express from "express";
const axios = require('axios')
const app = express()
const bodyParser = require('body-parser');

import {Request, Response} from 'express';
const esc = require("eventsource");
const stdio = require('stdio');
const fs = require('fs');

let configuration : Configuration | undefined = undefined

/**
 * Verify if the request has a valid token.
 */
async function validateRequest(req: Request, res: Response, reqProcessing: (req, res) => void) {
    const authorizationHeader = req.header("Authorization")
    if (authorizationHeader == null || !(authorizationHeader.startsWith("Bearer "))) {
        configuration.log(`  authorization header not present or not valid -> rejecting`)
        res.status(403)
        return
    }
    const token = authorizationHeader.substr("Bearer ".length)
    const isTokenValid = await configuration.tokenValidator.checkToken(token)
    if (isTokenValid) {
        configuration.log(`  token valid -> forwarding`)
        reqProcessing(req, res)
    } else {
        configuration.log(`  token not valid -> rejecting`)
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

function main() {
    const options = stdio.getopt({
        'conffile': {key: 'c', args: 1, description: 'Path to the configuration file', default: "auth-conf.json"},
    });
    if (!fs.existsSync(options.conffile)) {
        console.error("Configuration file not found:", options.conffile)
        process.exit(1)
    }

    app.use(bodyParser.text({limit: '50mb', extended: true}));
    configuration = loadConfiguration(options.conffile)
    app.use((req,res,next)=>{
        // This is treated specially as SSE are a bit different, as far as I understand
        if (req.path.startsWith("/subscribe/")) {
            next()
        } else {
            configuration.log(`processing ${req.method} request to ${req.path}`)
            validateRequest(req, res, (req, res) => forwardRequest(req, res))
        }
    })

    app.listen(configuration.port, () => {
        configuration.log(`Modelix Auth Proxy listening at http://localhost:${configuration.port}`)
    })
    app.get('/subscribe/:key', eventsHandler);
    const router = express.Router();
    app.use(router);
}

main()