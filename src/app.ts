import {Configuration, loadConfiguration} from "./configuration";

import express from "express";
const axios = require('axios')
const app = express()
const bodyParser = require('body-parser');

import {Request, Response} from 'express';
import {AxiosResponse} from "axios";
import {failedValidation, ValidationResult} from "./token_validators";
const esc = require("eventsource");
const stdio = require('stdio');
const fs = require('fs');

let configuration : Configuration | undefined = undefined

type RequestProcessing = (req: Request, res: Response, validationResult: ValidationResult) => void

/**
 * Verify if the request has a valid token.
 */
async function validateRequest(req: Request, res: Response,
                               validatedRequestProcessing: RequestProcessing,
                               rejectedRequestProcessing: RequestProcessing = (req, res, validRes)=> res.status(403)) : Promise<void> {
    const authorizationHeader = req.header("Authorization")
    if (authorizationHeader == null || !(authorizationHeader.startsWith("Bearer "))) {
        configuration.log(`  authorization header not present or not valid -> rejecting`)
        rejectedRequestProcessing(req, res, failedValidation())
        return
    }
    const token = authorizationHeader.substr("Bearer ".length)
    const validationResult : ValidationResult = await configuration.tokenValidator.checkToken(token, configuration)
    if (validationResult.success) {
        configuration.log(`  token valid -> forwarding`)
        validatedRequestProcessing(req, res, validationResult)
    } else {
        configuration.log(`  token not valid -> rejecting`)
        rejectedRequestProcessing(req, res, failedValidation())
    }
}

async function forwardRequest(req: Request, res: Response, validationResult: ValidationResult) {
    const forwardURL = `${configuration.mmsURL}${req.path}`
    let response : Promise<AxiosResponse<any>>
    if (req.method === 'GET') {
        response = axios.get(forwardURL)
    } else if (req.method === 'PUT') {
        response = axios.put(forwardURL)
    } else if (req.method === 'POST') {
        response = axios.post(forwardURL)
    } else {
        throw new Error(`Unsupported method ${req.method}`)
    }
    response.then(resMss => {
        const body = resMss.data as string
        if (validationResult.name != null) {
            res.header("X-Forwarded-For", validationResult.name);
        }
        if (validationResult.email != null) {
            res.header("X-Forwarded-Email", validationResult.email);
        }
        res.status(200).send(body)
    })
    .catch(error => {
        console.error(error)
    })
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
        } else if (req.path === "/checktoken") {
            next()
        } else {
            configuration.log(`processing ${req.method} request to ${req.path}`)
            void validateRequest(req, res, forwardRequest)
        }
    })

    app.listen(configuration.port, () => {
        configuration.log(`Modelix Auth Proxy listening at http://localhost:${configuration.port}`)
    })
    app.get('/subscribe/:key', eventsHandler);
    app.get('/checktoken', (req, res, next) => {
        void validateRequest(req, res,
            (req, res, validationResult) => {
                res.status(200).send(`The token is valid: ${JSON.stringify(validationResult)}`)
            },
            (req, res, validationResult) => {
                res.status(200).send(`The token is not valid`)
            })
    });
    const router = express.Router();
    app.use(router);
}

main()