import {TokenValidator, UserInfoTokenValidator} from "./verification";

export class Configuration {
    tokenValidator: TokenValidator
    mmsURL: string

    constructor(tokenValidator: TokenValidator, mmsURL: string) {
        this.tokenValidator = tokenValidator
        this.mmsURL = mmsURL
    }
}

export function loadConfiguration() : Configuration {
    const confFile = 'mps-auth-conf.json'
    const fs = require('fs');

    let conftext = fs.readFileSync(confFile);
    let confdata = JSON.parse(conftext);

    const mmsURL = confdata["mmsURL"];
    if (mmsURL == null) {
        throw new Error(`Key mmsURL not present in ${confFile}`)
    }
    const tokenValidatorData = confdata["tokenValidator"];
    if (tokenValidatorData == null) {
        throw new Error(`Key tokenValidator not present in ${confFile}`)
    }
    const tokenValidatorType = tokenValidatorData["type"];
    if (tokenValidatorType == null) {
        throw new Error(`Key tokenValidator.type not present in ${confFile}. Valid values are: UserInfoTokenValidator`)
    }
    let tokenValidator: TokenValidator
    if (tokenValidatorType === "UserInfoTokenValidator") {
        const address = tokenValidatorData["address"]
        if (address == null) {
            throw new Error(`Key tokenValidator.address not present in ${confFile}`)
        }
        tokenValidator = new UserInfoTokenValidator(address)
    } else {
        throw new Error(`Unknown token validator type: ${tokenValidatorType}`)
    }
    return new Configuration(tokenValidator, mmsURL)
}