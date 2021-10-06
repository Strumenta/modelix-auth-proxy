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

export class RegistryTokenValidator implements TokenValidator {

    private defaultResult: ValidationResult;
    private specificResults: {[key:string]: ValidationResult} = {};

    constructor(defaultResult: ValidationResult) {
        this.defaultResult = defaultResult;
    }

    addSpecificConfiguration(token: string, result: ValidationResult) {
        this.specificResults[token] = result;
    }

    checkToken(token: string, configuration: Configuration): Promise<ValidationResult> {
        return Promise.resolve(this.specificResults[token] || this.defaultResult);
    }

}

function loadUserInfoTokenValidator(confFilePath: string, tokenValidatorData: any) : UserInfoTokenValidator {
    const address = tokenValidatorData["address"]
    if (address == null) {
        throw new Error(`Key tokenValidator.address not present in ${confFilePath}`)
    }
    return new UserInfoTokenValidator(address);
}

function loadUserValidation(confFilePath: string, positionDescription: string, data: any) : ValidationResult {
    if (data == null) {
        throw new Error(`Key ${positionDescription} not present in ${confFilePath}`);
    }
    const success = data["success"];
    if (success == null) {
        throw new Error(`Key ${positionDescription}.success not present in ${confFilePath}`)
    }
    if (!(typeof success == "boolean")) {
        throw new Error(`Key ${positionDescription}.success in ${confFilePath} is not boolean`)
    }
    const email = data["email"];
    if (email != null && !(typeof email == "string")) {
        throw new Error(`Key ${positionDescription}.email in ${confFilePath} is not a string`)
    }
    const name = data["name"];
    if (name != null && !(typeof name == "string")) {
        throw new Error(`Key ${positionDescription}.name in ${confFilePath} is not a string`)
    }
    return {
        success, email, name
    }
}

function loadRegistryTokenValidator(confFilePath: string, tokenValidatorData: any) : RegistryTokenValidator {
    const defaultUserValidation : ValidationResult = loadUserValidation(confFilePath,
        "tokenValidator.defaultResult", tokenValidatorData["defaultResult"]);
    const specificCases : [any] = tokenValidatorData["specificCases"] || [];
    const validator = new RegistryTokenValidator(defaultUserValidation);
    specificCases.forEach((entry: any, index: number) => {
        const token: string = entry["token"];
        if (token == null) {
            throw new Error(`Key tokenValidator.specificCases[${index}].token not present in ${confFilePath}`)
        }
        validator.addSpecificConfiguration(token, loadUserValidation(confFilePath,
            `tokenValidator.specificCases[${index}].result`, entry["result"]))
    })
    return validator;
}

export function loadTokenValidator(confFilePath: string, tokenValidatorData: any) : TokenValidator {
    const tokenValidatorType = tokenValidatorData["type"];
    if (tokenValidatorType == null) {
        throw new Error(`Key tokenValidator.type not present in ${confFilePath}. Valid values are: UserInfoTokenValidator`)
    }
    if (tokenValidatorType === "UserInfoTokenValidator") {
        return loadUserInfoTokenValidator(confFilePath, tokenValidatorData);
    } else if (tokenValidatorType === "RegistryTokenValidator") {
        return loadRegistryTokenValidator(confFilePath, tokenValidatorData);
    } else {
        throw new Error(`Unknown token validator type: ${tokenValidatorType}`)
    }
}
