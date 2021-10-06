import {Configuration} from "./configuration";

const axios = require('axios')

const validTokens = [];

export interface ValidationResult {
    success: boolean
    email: string | null
    name: string | null
}

export function failedValidation() : ValidationResult {
    return {
        success: false,
        email: null,
        name: null
    }
}

function successfulValidation(email: string = null, name: string = null) : ValidationResult {
    return {
        success: true,
        email,
        name
    }
}

export interface TokenValidator {
    checkToken(token: string, configuration: Configuration): Promise<ValidationResult>
}

export class UserInfoTokenValidator implements TokenValidator {
    address: string;

    constructor(address: string) {
        this.address = address
    }

    checkToken(token: string, configuration: Configuration): Promise<ValidationResult> {
        const instance = this;
        return new Promise<ValidationResult>(function (resolve, reject) {
            if (token == null || token == "null") {
                resolve(failedValidation());
                return;
            }
            if (validTokens.indexOf(token) != -1) {
                resolve(successfulValidation());
                return;
            }
            configuration.log(`doing actual request for token: ${token}`)
            axios
                .get(`${instance.address}`, {
                    'headers': {
                        "Access-Control-Allow-Origin": "*",
                        "Content-type": "Application/json",
                        'Authorization': `Bearer ${token}`
                    }
                })
                .then(resMss => {
                    const body = resMss.data
                    const name = body["name"]
                    const email = body["email"]
                    validTokens.push(token);
                    resolve(successfulValidation(email, name));
                    return;
                })
                .catch(error => {
                    resolve(failedValidation());
                    return;
                })
        });
    }
}
