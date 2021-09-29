const axios = require('axios')

const validTokens = [];

export interface TokenValidator {
    checkToken(token: string): Promise<boolean>
}

export class UserInfoTokenValidator implements TokenValidator {
    address: string;

    constructor(address: string) {
        this.address = address
    }

    checkToken(token: string): Promise<boolean> {
        return new Promise<boolean>(function (resolve, reject) {
            if (token == null || token == "null") {
                resolve(false);
                return;
            }
            if (validTokens.indexOf(token) != -1) {
                resolve(true);
                return;
            }
            console.log("doing actual request for token", token)
            axios
                .get(`${this.address}`, {
                    'headers': {
                        "Access-Control-Allow-Origin": "*",
                        "Content-type": "Application/json",
                        'Authorization': `Bearer ${token}`
                    }
                })
                .then(resMss => {
                    const body = resMss.data as string
                    validTokens.push(token);
                    resolve(true);
                    return;
                })
                .catch(error => {
                    resolve(false);
                    return;
                })
        });
    }
}
