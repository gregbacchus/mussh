import expandTilde = require('expand-tilde');
import fs = require('fs');
import _ = require('underscore');
import YAML = require('yamljs');

import {
  Auth,
  IServer,
} from './types';

export interface IConfig {
  auths: Auth[];
  servers: IConfigServer[];
}

export interface IConfigServer {
  auth?: Auth;
  authid?: string;
  hostname: string;
  id?: string;
  ip?: 'v4' | 'v6';
  port?: number;
  tags?: string[];
}

export class Config {

  public static load(paths: string[]): Config {
    for (const path of paths) {
      const expandedPath = expandTilde(path);
      if (!fs.existsSync(expandedPath)) continue;
      const config = YAML.load(expandedPath);
      // TODO validate

      Config.expandAuthsPaths(config.auths);
      Config.expandServerPaths(config.servers);
      return new Config(config.auths, config.servers);
    }
    return new Config([], []);
  }

  private static expandAuthsPaths(auths: Auth[]) {
    for (const auth of auths) {
      if (auth.type !== 'rsa') continue;
      auth.keyPath = expandTilde(auth.keyPath);
    }
  }

  private static expandServerPaths(servers: IConfigServer[]) {
    for (const server of servers) {
      if (!server.auth || server.auth.type !== 'rsa') continue;
      server.auth.keyPath = expandTilde(server.auth.keyPath);
    }
  }

  private static isMatch(server: IConfigServer, ids?: string[], tags?: string[]): boolean {
    if (ids && ids.length) {
      for (const id of ids) {
        if (server.id === id) return true;
      }
      return false;
    }
    if (tags && tags.length) {
      if (!server.tags || !server.tags.length) return false;

      if (_.difference(tags, server.tags).length) return false;
    }
    return true;
  }

  constructor(
    private auths: Auth[],
    private servers: IConfigServer[],
  ) {}

  public getMatchingServers(ids?: string[], tags?: string[]): IServer[] {
    if (!this.servers.length) return [];

    const indexAuths = this.auths
      ? _.indexBy(this.auths, 'id')
      : {};

    const servers: IServer[] = [];
    for (const server of this.servers) {
      if (!Config.isMatch(server, ids, tags)) continue;
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
