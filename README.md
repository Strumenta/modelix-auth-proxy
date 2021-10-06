# Modelix Auth Proxy

This proxy checks the presence of an OAuth token and verifies its validity. 
In case the token is valid the request is forwarded to a Modelix Model Server, otherwise it is rejected.

## Configuration

By default the application looks for a file named auth-conf.json. It is possible to specify a different configuration 
file using the -c option:

```
node dist/app.js -c my-conf.json
```

Example of a configuration file:

```
{
  "port": 3400,
  "tokenValidator": {
    "type": "UserInfoTokenValidator",
    "address": "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  "mmsURL": "https://myprotectedmodelserver.com"
}
```

The port specified in the configuration file can be overriden by using the environment variable AUTH_PORT.

## Token Validators

There are two types of token validators: UserInfoTokenValidators and RegistryTokenValidators.

UserInfoTokenValidators require an address to be specified. A GET request will be made to such address passing the token
and the validator will return the values obtained (name and email, both optional) or communicate that the token could not be validated.

For example:

```
  "tokenValidator": {
    "type": "UserInfoTokenValidator",
    "address": "https://www.googleapis.com/oauth2/v3/userinfo"
  }
```

RegistryTokenValidators instead are defined by creating a default validation result (typically a failure to validate the 
token) and then specific results to be provided for specific tokens.

For example:

```
  "tokenValidator": {
    "type": "RegistryTokenValidator",
    "defaultResult": {
      "success": false
    },
    "specificCases": [
      {
        "token": "qwerty",
        "result": {
          "success": true,
          "name": "Federico",
          "email": "federico@example.com"
        }
      }
    ]
  },
```

In this case we specify that all tokens but `qwerty` will fail. We also specificy the name and email to associate to such
token.

## Values extracted from token

Depending of the OAuth configuration we may be able or not to get the name of the user and its email.
If we are able to get them, we will forward them, otherwise we will not.
The name will be sent as the header `X-Forwarded-For` while the email will be sent as the header `X-Forwarded-Email`.

## Routes

There is a special route to check tokens. It could be useful for debugging. The route is a GET to `/checktoken`.
