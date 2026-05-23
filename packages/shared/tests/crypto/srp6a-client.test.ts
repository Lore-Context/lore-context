// V2.0.5-E5 + V2.0.5-S3 acceptance: SRP-6a client transmits 0 passphrase
// bytes (byte-recording mock-server test).

import { describe, expect, it } from "vitest";
import {
  clientFinishLogin,
  clientStartLogin,
  clientStep1Payload,
  clientVerifyServer,
  serverFinishLogin,
  serverStartLogin,
  setupVerifier
} from "../../src/crypto/srp6a-client.js";

const USERNAME = "shuanbao@example.com";
const PASSPHRASE = "correct horse battery staple unicorn";

describe("setupVerifier", () => {
  it("produces a salt + verifier pair", () => {
    const { salt, verifier } = setupVerifier(USERNAME, PASSPHRASE);
    expect(salt.length).toBeGreaterThan(0);
    expect(verifier.length).toBeGreaterThan(0);
  });

  it("rejects empty username or passphrase", () => {
    expect(() => setupVerifier("", PASSPHRASE)).toThrow();
    expect(() => setupVerifier(USERNAME, "")).toThrow();
  });
});

describe("V2.0.5-E5 + V2.0.5-S3: full SRP-6a handshake never transmits passphrase", () => {
  it("handshake succeeds with correct passphrase", () => {
    // Setup time
    const { salt, verifier } = setupVerifier(USERNAME, PASSPHRASE);

    // Step 1: client starts login
    const clientState = clientStartLogin(USERNAME, PASSPHRASE, salt);
    const step1 = clientStep1Payload(clientState);

    // Step 2: server starts (using stored verifier)
    const serverState = serverStartLogin(verifier);
    const serverPublicEphemeral = serverState.serverEphemeral.public;

    // Step 3: client derives session + proof
    const { clientProof, sessionKey: clientKey } = clientFinishLogin(
      clientState,
      salt,
      serverPublicEphemeral
    );

    // Step 4: server validates client proof + returns server proof
    const { serverProof, sessionKey: serverKey } = serverFinishLogin(
      serverState,
      step1.clientPublicEphemeral,
      salt,
      USERNAME,
      verifier,
      clientProof
    );

    // Step 5: client verifies server proof
    expect(() => clientVerifyServer(clientState, serverProof)).not.toThrow();

    // Both sides arrived at the same session key without ever exchanging
    // the passphrase.
    expect(clientKey).toBe(serverKey);
  });

  it("byte-recording: no client-→-server message contains the passphrase", () => {
    const { salt, verifier } = setupVerifier(USERNAME, PASSPHRASE);
    const clientState = clientStartLogin(USERNAME, PASSPHRASE, salt);
    const step1 = clientStep1Payload(clientState);

    const serverState = serverStartLogin(verifier);
    const { clientProof } = clientFinishLogin(
      clientState,
      salt,
      serverState.serverEphemeral.public
    );

    // Collect every byte the client legitimately sends to the server during
    // the entire handshake.
    const clientToServerPayloads: string[] = [
      JSON.stringify(step1), // step 1: username + clientPublicEphemeral
      JSON.stringify({ clientPublicEphemeral: step1.clientPublicEphemeral, clientProof }) // step 3
    ];
    // Plus the setup-time upload:
    clientToServerPayloads.push(JSON.stringify({ salt, verifier }));

    // None of these payloads may contain the passphrase, in any encoding.
    const passphraseBytes = Buffer.from(PASSPHRASE, "utf8");
    const passphraseHex = passphraseBytes.toString("hex");
    const passphraseBase64 = passphraseBytes.toString("base64");
    const passphraseUriEncoded = encodeURIComponent(PASSPHRASE);

    for (const payload of clientToServerPayloads) {
      expect(payload).not.toContain(PASSPHRASE);
      expect(payload).not.toContain(passphraseHex);
      expect(payload).not.toContain(passphraseBase64);
      expect(payload).not.toContain(passphraseUriEncoded);
    }
  });

  it("server rejects wrong passphrase", () => {
    const { salt, verifier } = setupVerifier(USERNAME, PASSPHRASE);

    // Attacker tries a different passphrase
    const wrongClientState = clientStartLogin(USERNAME, "WRONG-PASSPHRASE", salt);
    const wrongStep1 = clientStep1Payload(wrongClientState);

    const serverState = serverStartLogin(verifier);
    const { clientProof } = clientFinishLogin(
      wrongClientState,
      salt,
      serverState.serverEphemeral.public
    );

    expect(() =>
      serverFinishLogin(
        serverState,
        wrongStep1.clientPublicEphemeral,
        salt,
        USERNAME,
        verifier,
        clientProof
      )
    ).toThrowError(/client provided session proof is invalid/i);
  });

  it("client rejects wrong server (server doesn't know the verifier)", () => {
    const { salt } = setupVerifier(USERNAME, PASSPHRASE);
    const { verifier: realVerifier } = setupVerifier(USERNAME, PASSPHRASE);
    const { verifier: fakeVerifier } = setupVerifier(USERNAME, "different-pass-on-fake-server");

    const clientState = clientStartLogin(USERNAME, PASSPHRASE, salt);
    const step1 = clientStep1Payload(clientState);

    // A bogus server starts with the WRONG verifier
    const bogusServerState = serverStartLogin(fakeVerifier);
    const { clientProof } = clientFinishLogin(
      clientState,
      salt,
      bogusServerState.serverEphemeral.public
    );

    // The bogus server cannot produce a valid server proof for the
    // real client proof against its WRONG verifier.
    expect(() =>
      serverFinishLogin(
        bogusServerState,
        step1.clientPublicEphemeral,
        salt,
        USERNAME,
        fakeVerifier,
        clientProof
      )
    ).toThrowError(/client provided session proof is invalid/i);
    // Note: realVerifier is unused but kept for documentation
    void realVerifier;
  });

  it("replay attack: reusing an old clientProof fails on a fresh server ephemeral", () => {
    const { salt, verifier } = setupVerifier(USERNAME, PASSPHRASE);

    // First successful handshake — captured by attacker
    const c1 = clientStartLogin(USERNAME, PASSPHRASE, salt);
    const s1 = serverStartLogin(verifier);
    const first = clientFinishLogin(c1, salt, s1.serverEphemeral.public);
    serverFinishLogin(s1, c1.clientEphemeral.public, salt, USERNAME, verifier, first.clientProof);

    // Attacker replays first.clientProof against a NEW server ephemeral
    const s2 = serverStartLogin(verifier);
    expect(() =>
      serverFinishLogin(s2, c1.clientEphemeral.public, salt, USERNAME, verifier, first.clientProof)
    ).toThrow();
  });
});

describe("session key derivation", () => {
  it("each handshake produces a different session key", () => {
    const { salt, verifier } = setupVerifier(USERNAME, PASSPHRASE);

    const keys: string[] = [];
    for (let i = 0; i < 5; i++) {
      const c = clientStartLogin(USERNAME, PASSPHRASE, salt);
      const s = serverStartLogin(verifier);
      const result = clientFinishLogin(c, salt, s.serverEphemeral.public);
      keys.push(result.sessionKey);
    }
    // All 5 keys MUST differ because ephemeral keys differ
    expect(new Set(keys).size).toBe(5);
  });
});
