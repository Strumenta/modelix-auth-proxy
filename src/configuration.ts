import {TokenValidator, UserInfoTokenValidator} from "./verification";
const fs = require('fs');

const DEFAULT_PORT = 3000

export class Configuration {
    port: number
    tokenValidator: TokenValidator
    mmsURL: string
    verbose: boolean = false

    constructor(port: number, tokenValidator: TokenValidator, mmsURL: string) {
        this.port = port
        this.tokenValidator = tokenValidator
        this.mmsURL = mmsURL
    }

    log(message: string) {
        if (this.verbose) {
            console.log(message)
        }
    }
}

export function loadConfiguration(confFilePath: string) : Configuration {
    console.log(`Loading configuration from ${confFilePath}`)
    let conftext = fs.readFileSync(confFilePath);
    let confdata = JSON.parse(conftext);

    const port = process.env.AUTH_PORT || confdata["port"] || DEFAULT_PORT

    const mmsURL = confdata["mmsURL"];
    if (mmsURL == null) {
        throw new Error(`Key mmsURL not present in ${confFilePath}`)
    }
    const tokenValidatorData = confdata["tokenValidator"];
    if (tokenValidatorData == null) {
        throw new Error(`Key tokenValidator not present in ${confFilePath}`)
    }
    const tokenValidatorType = tokenValidatorData["type"];
    if (tokenValidatorType == null) {
        throw new Error(`Key tokenValidator.type not present in ${confFilePath}. Valid values are: UserInfoTokenValidator`)
    }
    let tokenValidator: TokenValidator
    if (tokenValidatorType === "UserInfoTokenValidator") {
        const address = tokenValidatorData["address"]
        if (address == null) {
            throw new Error(`Key tokenValidator.address not present in ${confFilePath}`)
        }
        tokenValidator = new UserInfoTokenValidator(address)
    } else {
        throw new Error(`Unknown token validator type: ${tokenValidatorType}`)
    }
    const configuration = new Configuration(port, tokenValidator, mmsURL)
    const verbose = confdata["verbose"]
    if (verbose !== undefined) {
        configuration.verbose = verbose
    }
    return configuration
}
