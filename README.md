# MUlti SSH

For running SSH commands on multiple servers.

## Usage

To run on all web servers:

```bash
mussh run -t role:web "ls -lah"
```

To run on a specific server:

```bash
mussh run -i app1 "ls -lah" "df -h"
```

** Coming soon: run local scripts on remote server **
** Coming soon: SUDO_ASKPASS configuration **

## Matching

Target servers will be selected from the config file by either id(s) ot tag(s).

Specifying multipe `--id <id>` (or `-i <id>`) arguments will select the servers matching the specified ids.

Specifying multiple `--tag <tag>` (or `-t <tag>`) arguments will select only the servers that have *all of the matching tags*. (i.e. each tag argument filters down the number of target servers). E.g. to target all **web** servers in **west-us** you specify `-t web -t west-us`.

## Installation

```bash
npm i -g mussh
```

## Configuration

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


