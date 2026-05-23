// V2.0.5-E5: SRP-6a client (and the matching server-side validator used by
// Lane S vault-login endpoint). Wraps the `secure-remote-password` library
// which implements RFC 5054 with the 2048-bit prime group.
//
// The point of SRP-6a here is that the user's Master Passphrase NEVER
// crosses the wire. The server stores only `(salt, verifier)` — both of
// which are derived client-side at vault setup and uploaded once.
//
// Full handshake (client → server):
//   1. setup-time: client posts (salt, verifier) → server stores
//   2. login start: client posts username → server returns salt + serverPublic
//   3. client computes session, posts (clientPublic, clientProof)
//   4. server verifies clientProof, returns serverProof
//   5. client verifies serverProof → mutual auth complete; session key
//      lives in both sides' memory without ever traversing the network.

import * as srpClient from "secure-remote-password/client.js";
import * as srpServer from "secure-remote-password/server.js";

export interface SrpSetupOutput {
  salt: string; // hex
  verifier: string; // hex
}

/**
 * Run once at vault-setup. The salt + verifier are uploaded to the server;
 * the passphrase NEVER leaves the client.
 */
export function setupVerifier(username: string, passphrase: string): SrpSetupOutput {
  if (username.length === 0 || passphrase.length === 0) {
    throw new RangeError("username and passphrase must be non-empty");
  }
  const salt = srpClient.generateSalt();
  const privateKey = srpClient.derivePrivateKey(salt, username, passphrase);
  const verifier = srpClient.deriveVerifier(privateKey);
  return { salt, verifier };
}

export interface ClientLoginState {
  username: string;
  /** Private key derived from passphrase — stays in client memory only. */
  privateKey: string;
  /** Client-side ephemeral keypair. */
  clientEphemeral: { secret: string; public: string };
  /** Filled in on `clientFinishLogin`. */
  sessionKey?: string;
  clientProof?: string;
}

/**
 * Step 1 of login (client side). The client derives privateKey from the
 * passphrase and generates an ephemeral keypair. The PUBLIC half is sent
 * to the server; the private half (and the derived privateKey) stay in
 * client memory.
 */
export function clientStartLogin(username: string, passphrase: string, salt: string): ClientLoginState {
  if (salt.length === 0) throw new RangeError("salt must be non-empty");
  const privateKey = srpClient.derivePrivateKey(salt, username, passphrase);
  const clientEphemeral = srpClient.generateEphemeral();
  return { username, privateKey, clientEphemeral };
}

/** Bytes that the client may legally send to the server in step 1. */
export function clientStep1Payload(state: ClientLoginState): {
  username: string;
  clientPublicEphemeral: string;
} {
  return { username: state.username, clientPublicEphemeral: state.clientEphemeral.public };
}

/**
 * Step 3 of login (client side). Given the server's salt + ephemeral
 * public, derive the shared session key + the client proof to send back.
 */
export function clientFinishLogin(
  state: ClientLoginState,
  salt: string,
  serverPublicEphemeral: string
): { clientProof: string; sessionKey: string } {
  const session = srpClient.deriveSession(
    state.clientEphemeral.secret,
    serverPublicEphemeral,
    salt,
    state.username,
    state.privateKey
  );
  state.sessionKey = session.key;
  state.clientProof = session.proof;
  return { clientProof: session.proof, sessionKey: session.key };
}

/**
 * Step 5 of login (client side). Verify the server's proof. Throws on
 * mismatch (server didn't actually know the verifier).
 */
export function clientVerifyServer(
  state: ClientLoginState,
  serverProof: string
): void {
  srpClient.verifySession(state.clientEphemeral.public, { key: state.sessionKey!, proof: state.clientProof! }, serverProof);
}

// ── Server side ────────────────────────────────────────────────────────

export interface ServerLoginState {
  serverEphemeral: { secret: string; public: string };
  sessionKey?: string;
  serverProof?: string;
}

/**
 * Step 2 of login (server side). Given the stored verifier, generate the
 * server's ephemeral keypair. The PUBLIC half (+ stored salt) goes back
 * to the client.
 */
export function serverStartLogin(verifier: string): ServerLoginState {
  if (verifier.length === 0) throw new RangeError("verifier must be non-empty");
  const serverEphemeral = srpServer.generateEphemeral(verifier);
  return { serverEphemeral };
}

/**
 * Step 4 of login (server side). Given client's proof, derive the session
 * key + server proof. Throws if client's proof is invalid (wrong
 * passphrase or replay attempt).
 */
export function serverFinishLogin(
  state: ServerLoginState,
  clientPublicEphemeral: string,
  salt: string,
  username: string,
  verifier: string,
  clientProof: string
): { serverProof: string; sessionKey: string } {
  const session = srpServer.deriveSession(
    state.serverEphemeral.secret,
    clientPublicEphemeral,
    salt,
    username,
    verifier,
    clientProof
  );
  state.sessionKey = session.key;
  state.serverProof = session.proof;
  return { serverProof: session.proof, sessionKey: session.key };
}
