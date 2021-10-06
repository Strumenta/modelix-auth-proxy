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

## Values extracted from token

Depending of the OAuth configuration we may be able or not to get the name of the user and its email.
If we are able to get them, we will forward them, otherwise we will not.
The name will be sent as the header `X-Forwarded-For` while the email will be sent as the header `X-Forwarded-Email`.

## Routes

There is a special route to check tokens. It could be useful for debugging. The route is a GET to `/checktoken`.
