# DEVOPS EASY LEARNING  REVIVE PROJECT


app:
  name: Revive API
  host: http://localhost:8080
  openApiConf:
    filePath: ./openapi.yaml

autoLogin:
  type: form
  url: /login
  usernameField: username
  passwordField: password
  username: admin
  password: secret123
  success:
    type: contains
    value: dashboard

env: dev

reporting:
  slack:
    channel: "#security-alerts"
    enabled: true




###########################################
  requests:
  headers:
    Cookie: sessionid=abc123


  requests:
  headers:
    Authorization: Bearer <token>








![revive](https://github.com/DEL-ORG/s6-terraform-code/assets/96950933/9e6a2443-6cfa-4ab2-bc49-266045418cdc)
