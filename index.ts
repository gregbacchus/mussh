import fs = require('fs');
import _ = require('underscore');
import YAML = require('yamljs');
import yargs = require('yargs');
import {Arguments, Argv, argv} from 'yargs';
import {Runner} from './runner';

import {
  Auth,
  IConfig,
  IConfigServer,
  IRunArgs,
  ISearchArgs,
  IServer,
} from './types';
import {asArray} from './util';

const PATH_CONFIG = [
  '~/.mussh/config.yaml',
  './config.yaml',
];

export class App {

  private static isMatch(server: IConfigServer, ids: string[], tags: string[]): boolean {
    if (ids.length) {
      for (const id of ids) {
        if (server.id !== id) return false;
      }
    }
    if (tags.length) {
      if (!server.tags || !server.tags.length) return false;

      if (!_.intersection(server.tags, tags).length) return false;
    }
    return true;
  }

  private static searchArgs() {
    return {
      id: {
        alias: 'i',
        description: 'ID of server (can be multiple)',
        type: 'string',
      },
      tag: {
        alias: 't',
        description: 'Server tags to match (can be multiple)',
        type: 'string',
      },
    };
  }

  private static searchCheck(argv, options) {
    if (!argv.id && !argv.tag) return 'Either --id or --tag must be provided';
    return true;
  }

  private config: IConfig;
  private argv: Arguments;

  constructor() {
    // read configuration
    for (const path of PATH_CONFIG) {
      if (!fs.existsSync(path)) continue;
      this.config = YAML.load(path);
      break;
    }
  }

  public main() {
    // parse arguments and dispatch commands
    this.argv = yargs
      .usage('Usage: $0 <command> [options]')
      .example('$0 list --help', 'learn more about the help command')
      .example('$0 run --help', 'learn more about the help command')
      .demandCommand(1)
      .command(['list', 'ls'], 'show servers that match the query', (run: Argv) => {
        return run
          .usage('Usage: $0 list [options] <remote command>')
          .example('$0 list -t role:web', 'matches servers with tag `role:web`')
          .example('$0 list -t role:web -t region:us', 'matches servers with tag `role:web` and `region:us`')
          .example('$0 list -i server-id', 'matches servers id `server-id`')
          .options(App.searchArgs() as any)
          .check(App.searchCheck);
      }, this.list.bind(this))
      .command(['run', 'r'], 'run a the command in remote sessions', (run: Argv) => {
        return run
          .usage('Usage: $0 run [options] <remote command>')
          .example('$0 run -t role:web "df -h"', 'display free disk space on all web servers')
          .example('$0 run -t role:web -s run.sh', 'execute `run.sh` on all web servers')
          .options(_.extend({}, App.searchArgs(), {
            script: {
              alias: 's',
              description: 'Path of script to execute',
              type: 'string',
            },
          }))
          .check(App.searchCheck);
      }, this.run.bind(this))
      .argv;
  }

  /**
   * `list` command
   */
  private list(argv: ISearchArgs) {
    const servers = this.getMatchingServers(asArray(argv.id), asArray(argv.tag));

    // tslint:disable-next-line:no-console
    console.log(servers);
  }

  /**
   * `run` command
   */
  private run(argv: IRunArgs) {
    const servers = this.getMatchingServers(asArray(argv.id), asArray(argv.tag));

    for (const server of servers) {
      const runner = new Runner(server);
      asArray(argv.script).forEach(path => {
        runner.execFile(path)
          .catch(console.error);
      });
      (argv as any)._.slice(1).forEach(literal => {
        runner.exec(literal)
          // .then(console.log)
          .catch(console.error);
      });
    }
  }

  private getMatchingServers(ids: string[], tags: string[]): IServer[] {
    if (!this.config || !this.config.servers) return [];

    const indexAuths = this.config.auths
      ? _.indexBy(this.config.auths, 'id')
      : {};

    const servers: IServer[] = [];
    for (const server of this.config.servers) {
      if (!App.isMatch(server, ids, tags)) continue;
      servers.push({
        auth: server.auth || server.authid && indexAuths[server.authid] as Auth || undefined,
        hostname: server.hostname,
        id: server.id,
        ip: server.ip,
        port: server.port || 22,
        tags: server.tags || [],
      });
    }
    return servers;
  }
}
