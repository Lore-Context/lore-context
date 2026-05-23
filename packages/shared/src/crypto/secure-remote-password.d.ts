// Ambient declarations for `secure-remote-password` (no @types/* available).
//
// This is the minimal surface we use in `srp6a-client.ts`. The runtime
// behaviour is the upstream library at npm:secure-remote-password@0.3.1
// which implements RFC 5054 (2048-bit prime group).

declare module "secure-remote-password/client.js" {
  export function generateSalt(): string;
  export function derivePrivateKey(salt: string, username: string, password: string): string;
  export function deriveVerifier(privateKey: string): string;

  export interface ClientEphemeral {
    secret: string;
    public: string;
  }
  export function generateEphemeral(): ClientEphemeral;

  export interface ClientSession {
    key: string;
    proof: string;
  }
  export function deriveSession(
    clientSecretEphemeral: string,
    serverPublicEphemeral: string,
    salt: string,
    username: string,
    privateKey: string
  ): ClientSession;

  export function verifySession(
    clientPublicEphemeral: string,
    clientSession: ClientSession,
    serverSessionProof: string
  ): void;
}

declare module "secure-remote-password/server.js" {
  export interface ServerEphemeral {
    secret: string;
    public: string;
  }
  export function generateEphemeral(verifier: string): ServerEphemeral;

  export interface ServerSession {
    key: string;
    proof: string;
  }
  export function deriveSession(
    serverSecretEphemeral: string,
    clientPublicEphemeral: string,
    salt: string,
    username: string,
    verifier: string,
    clientSessionProof: string
  ): ServerSession;
}
