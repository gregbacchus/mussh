import _ = require('underscore');
import yargs = require('yargs');
import { Arguments, Argv } from 'yargs';
import { Config } from './config';
import { Runner } from './runner';

import {
  IRunArgs,
  ISearchArgs,
} from './types';
import { asArray } from './util';

const PATH_CONFIG = [
  '~/.mussh/config.yaml',
];

export class App {

  private static searchArgs() {
    return {
      all: {
        alias: 'a',
        default: false,
        description: 'All listed servers',
      },
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
    if (!argv.all && !argv.id && !argv.tag) return 'Either --all, --id or --tag must be provided';
    return true;
  }

  private config: Config;
  private argv: Arguments;

  constructor() {
    // read configuration
    this.config = Config.load(PATH_CONFIG);
  }

  public main() {
    // parse arguments and dispatch commands
    this.argv = yargs
      .usage('Usage: $0 <command> [options]')
      .example('$0 list --help', 'learn more about the help command')
      .example('$0 run --help', 'learn more about the help command')
      .example('$0 tags', 'list available tags')
      .demandCommand(1)
      .command(['list', 'ls'], 'show servers that match the query', (run: Argv) => {
        return run
          .usage('Usage: $0 list [options] <remote command>')
          .example('$0 list -t role:web', 'matches servers with tag `role:web`')
          .example('$0 list -t role:web -t region:us', 'matches servers with tag `role:web` and `region:us`')
          .example('$0 list -i server-id', 'matches servers id `server-id`')
          .options(App.searchArgs() as any)
          .boolean('all')
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
          .boolean('all')
          .check(App.searchCheck);
      }, this.run.bind(this))
      .command(['tags', 'tag'], 'list available tags', this.tags.bind(this))
      .argv;
  }

  /**
   * `list` command
   */
  private list(argv: ISearchArgs) {
    const servers = this.config.getMatchingServers(Boolean(argv.all), asArray(argv.id), asArray(argv.tag));

    // tslint:disable-next-line:no-console
    console.log(servers);
  }

  /**
   * `run` command
   */
  private run(argv: IRunArgs) {
    const servers = this.config.getMatchingServers(Boolean(argv.all), asArray(argv.id), asArray(argv.tag));

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

  /**
   * `tags` command
   */
  private tags(argv: IRunArgs) {
    const servers = this.config.getMatchingServers(true);

    const tags = servers.reduce<string[]>((tagList, server) => {
      const output: string[] = tagList.slice(0);
      if (!server.tags || !server.tags.length) { return output; }
      server.tags.forEach(tag => {
        if (output.indexOf(tag) >= 0) { return; }
        output.push(tag);
      });
      return output;
    }, [] as string[]);
    tags.sort();

    // tslint:disable-next-line:no-console
    console.log(tags);
  }
}
