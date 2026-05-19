/**
 * SSH key formats for private key retrieval.
 */
export enum SshKeyFormat {
  OpenSsh = 'OpenSsh',
  Ssh2 = 'Ssh2',
  Putty = 'Putty',
}

/**
 * An A2A retrievable account as returned by the discovery endpoint.
 */
export interface RetrievableAccount {
  AccountId: number;
  AssetId: number;
  AssetName: string;
  AccountName: string;
  DomainName: string;
  AccountType: string;
  ApiKey: string;
}

/**
 * Brokered access request types.
 */
export enum BrokeredAccessRequestType {
  Password = 'Password',
  SshKey = 'SshKey',
  ApiKey = 'ApiKey',
  Token = 'Token',
  RdpFile = 'RdpFile',
  RemoteDesktop = 'RemoteDesktop',
  SshSession = 'SshSession',
}

/**
 * Options for creating a brokered access request.
 */
export interface BrokeredAccessRequest {
  AccessType: BrokeredAccessRequestType;
  ForUserId?: number;
  ForUserName?: string;
  AssetId?: number;
  AccountId?: number;
  AccountAssetId?: number;
  AccountName?: string;
  AssetName?: string;
  DomainName?: string;
}

/**
 * Response from a brokered access request.
 */
export interface BrokeredAccessResponse {
  RequestId: string;
  AccessToken?: string;
  [key: string]: unknown;
}
