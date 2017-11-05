# MUlti SSH

For running SSH commands on multiple servers.

Config file in `~/.mussh/config.yaml`

```yaml
auths:
  - id: default
    type: password
    username: myself
    password: super-secret
  - id: other
    type: rsa
    file: ~/.ssh/id_rsa
servers:
  - id: web1
    hostname: web1.example.com
    authid: default
    tags:
      - role:web
      - dc:us-west-2
  - id: web2
    hostname: web2.example.com
    authid: default
    tags:
      - role:web
      - dc:us-west
  - id: app1
    hostname: app1.example.com
    port: 9990
    ip: v6
    auth:
      type: password
      username: adhoc
      password: test
    tags:
      - foo:bar
```

To run on all web servers:

```bash
mussh run -t web "ls -lah"
```

To run on a specific server:

```bash
mussh run -i app1 "ls -lah" "df -h"
```
