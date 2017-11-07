export interface ISearchArgs {
  id: string | string[];
  tag: string | string[];
}

export interface IRunArgs extends ISearchArgs {
  script: string | string[];
}

export declare type Auth = IKeyAuth | IPasswordAuth;

export interface IAuth {
  id: string | undefined;
  username: string;
}

export interface IKeyAuth extends IAuth {
  type: 'rsa';
  keyPath: string;
}

export interface IPasswordAuth extends IAuth {
  type: 'password';
  password: string;
}

export interface IServer {
  auth?: Auth;
  hostname: string;
  id?: string;
  ip?: 'v4' | 'v6';
  port: number;
  tags: string[];
}
