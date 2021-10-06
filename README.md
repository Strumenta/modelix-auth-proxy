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
    "address": "https://accounts-ci.siginet.lu/connect/userinfo"
  },
  "mmsURL": "https://dsl-modelix.siginet.lu"
}
```

The port specified in the configuration file can be overriden by using the environment variable AUTH_PORT.