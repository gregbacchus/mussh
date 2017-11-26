import colors = require('colors/safe');
import expandTilde = require('expand-tilde');
import fs = require('fs');
import readline = require('readline');
import {Client, ConnectConfig} from 'ssh2';
import {Writable} from 'stream';
import {IServer} from './types';
import {WorkQueue} from './worker';

const queue = WorkQueue.get('default');

class MutableWriter {
  public muted: boolean = false;

  public getWriter() {
    return new Writable({
      write: (chunk, encoding, callback) => {
        if (!this.muted) {
          process.stdout.write(chunk);
        }
        callback();
      },
    });
  }
}

export class Runner {
  constructor(private readonly server: IServer) {
  }

  public async execFile(path: string) {
    const buffer = fs.readFileSync(expandTilde(path));
    await this.exec(buffer.toString());
  }

  public async exec(script: string) {
    const conn = new Client();

    // handle interactive login
    conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
      if (!prompts.length) {
        finish([]);
        return;
      }

      const results: string[] = [];
      const writer = new MutableWriter();
      let pending = prompts.length;
      for (const prompt of prompts) {
        queue.add(done => {
          // write server
          process.stdout.write(colors.green(`<<- ${this.server.id} #\n`));

          // write prompt
          process.stdout.write(prompt.prompt);
          writer.muted = !prompt.echo;

          // read response
          const reader = readline
            .createInterface({
              input: process.stdin,
              output: writer.getWriter(),
              terminal: true,
            });
          reader.on('line', line => {
            results.push(line);
            if (prompt && !prompt.echo) {
              process.stdout.write('\n');
            }
            reader.close();
            done();
          });
        }, () => {
          if (--pending) return;
          finish(results);
        });
      }
    });
    conn.on('ready', () => {
      conn.exec(script, (err, stream) => {
        if (err) throw err;

        stream
          .on('close', (code, signal) => {
            conn.end();
          })
          .on('data', data => {
            queue.add(done => {
              process.stdout.write(colors.yellow(`# ${this.server.id} ->>\n`) + data + '\n');
              done();
            });
          })
          .stderr.on('data', data => {
            queue.add(done => {
              process.stdout.write(colors.red(`${this.server.id}: ERROR ${data}\n`));
              done();
            });
          });
      });
    });
    this.connect(conn);
  }

  private connect(conn: Client) {
    const options: ConnectConfig = {
      forceIPv4: this.server.ip === 'v4',
      forceIPv6: this.server.ip === 'v6',
      host: this.server.hostname,
      port: this.server.port,
      readyTimeout: 120000,
      tryKeyboard: true,
      username: this.server.auth
        ? this.server.auth.username
        : require('os').userInfo().username,
    };
    if (this.server.auth) {
      if (this.server.auth.type === 'password') {
        options.password = this.server.auth.password;
      }
      if (this.server.auth.type === 'rsa') {
        options.privateKey = require('fs').readFileSync(this.server.auth.keyPath);
      }
    }
    conn.connect(options);
  }
}
