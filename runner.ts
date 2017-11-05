import colors = require('colors/safe');
import {read} from 'fs';
import readline = require('readline');
import {Client, ConnectConfig} from 'ssh2';
import {Writable} from 'stream';
import {IServer} from './types';

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

  }

  public async exec(script: string) {
    const conn = new Client();

    // handle interactive login
    conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
      // TODO: all this better
      process.stdout.write(colors.yellow(`${this.server.id} <<-\n`));
      const writer = new MutableWriter();
      const results: string[] = [];

      let prompt = prompts.shift();
      if (!prompt) {
        finish([]);
        return;
      }
      process.stdout.write(prompt.prompt);
      writer.muted = !prompt.echo;
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
        if (prompts.length) {
          prompt = prompts.shift();
          if (prompt) {
            process.stdout.write(prompt.prompt);
            writer.muted = !prompt.echo;
            return;
          }
        }
        reader.close();
        finish(results);
      });
    });
    conn.on('ready', () => {
      conn.exec(script, (err, stream) => {
        if (err) throw err;

        stream
          .on('close', (code, signal) => {
            conn.end();
          })
          .on('data', data => {
            process.stdout.write(colors.yellow(`${this.server.id} ->>\n`) + data + '\n');
          })
          .stderr.on('data', data => {
            process.stdout.write(colors.red(`${this.server.id}: ERROR ${data}\n`));
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
      readyTimeout: 60000,
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
