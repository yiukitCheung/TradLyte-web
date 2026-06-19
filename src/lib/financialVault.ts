/**
 * Zero-knowledge envelope encryption for the Financial Health vault.
 *
 * The data-encryption key (DEK) actually encrypts the financial blob; it is
 * wrapped twice — once by a key derived from the login password, once by a key
 * derived from a one-time recovery code. The server only ever stores ciphertext
 * and the wrapped DEKs, never the DEK or the password.
 *
 * Crypto contract — MUST stay byte-compatible with the mobile app
 * (see docs/mobile/FINANCIAL_HEALTH.md):
 *   KDF     PBKDF2-HMAC-SHA256, 210_000 iterations, 16-byte salt, 256-bit key
 *   Cipher  AES-256-GCM, 12-byte IV
 *   DEK     256-bit random raw bytes
 *   Encode  base64 for all binary fields; payload = AES-GCM(DEK, utf8(JSON))
 */

const PBKDF2_ITERS = 210_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const DEK_BYTES = 32;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toB64(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Derive a 256-bit AES-GCM key-encryption-key from a secret + salt. */
async function deriveKek(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", textEncoder.encode(secret), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function aesEncrypt(key: CryptoKey, data: Uint8Array): Promise<{ ct: string; iv: string }> {
  const iv = randomBytes(IV_BYTES);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { ct: toB64(ct), iv: toB64(iv) };
}

async function aesDecrypt(key: CryptoKey, ctB64: string, ivB64: string): Promise<Uint8Array> {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(ivB64) }, key, fromB64(ctB64));
  return new Uint8Array(pt);
}

/** Import raw DEK bytes as an AES-GCM key (extractable so we can re-wrap it). */
async function importDek(dekBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", dekBytes, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

// Crockford-style alphabet (32 chars, no I/L/O/U) — byte % 32 is unbiased.
const RC_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ0123456789";

/** A grouped, human-friendly recovery code with ~160 bits of entropy. */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(20);
  let raw = "";
  for (let i = 0; i < bytes.length; i++) raw += RC_ALPHABET[bytes[i] % 32];
  return raw.replace(/(.{4})(?=.)/g, "$1-");
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** The persisted key-wrapping fields (everything except the encrypted blob). */
export interface VaultCryptoFields {
  kdf_salt_pw: string;
  kdf_salt_rc: string;
  wrapped_dek_pw: string;
  wrapped_dek_pw_iv: string;
  wrapped_dek_rc: string;
  wrapped_dek_rc_iv: string;
}

/** Mint a brand-new vault: fresh DEK + recovery code, both wraps computed. */
export async function createVaultKeys(password: string): Promise<{
  fields: VaultCryptoFields;
  recoveryCode: string;
  dek: CryptoKey;
}> {
  const dekBytes = randomBytes(DEK_BYTES);
  const saltPw = randomBytes(SALT_BYTES);
  const saltRc = randomBytes(SALT_BYTES);
  const recoveryCode = generateRecoveryCode();

  const kekPw = await deriveKek(password, saltPw);
  const kekRc = await deriveKek(normalizeRecoveryCode(recoveryCode), saltRc);
  const wpw = await aesEncrypt(kekPw, dekBytes);
  const wrc = await aesEncrypt(kekRc, dekBytes);

  return {
    fields: {
      kdf_salt_pw: toB64(saltPw),
      kdf_salt_rc: toB64(saltRc),
      wrapped_dek_pw: wpw.ct,
      wrapped_dek_pw_iv: wpw.iv,
      wrapped_dek_rc: wrc.ct,
      wrapped_dek_rc_iv: wrc.iv,
    },
    recoveryCode,
    dek: await importDek(dekBytes),
  };
}

export async function unlockWithPassword(password: string, fields: VaultCryptoFields): Promise<CryptoKey> {
  const kek = await deriveKek(password, fromB64(fields.kdf_salt_pw));
  const dekBytes = await aesDecrypt(kek, fields.wrapped_dek_pw, fields.wrapped_dek_pw_iv);
  return importDek(dekBytes);
}

export async function unlockWithRecoveryCode(code: string, fields: VaultCryptoFields): Promise<CryptoKey> {
  const kek = await deriveKek(normalizeRecoveryCode(code), fromB64(fields.kdf_salt_rc));
  const dekBytes = await aesDecrypt(kek, fields.wrapped_dek_rc, fields.wrapped_dek_rc_iv);
  return importDek(dekBytes);
}

/** Re-wrap an unlocked DEK under a (new) password — self-heals seamless unlock
 * after a password change or a recovery-code unlock. */
export async function rewrapForPassword(
  dek: CryptoKey,
  password: string,
): Promise<Pick<VaultCryptoFields, "kdf_salt_pw" | "wrapped_dek_pw" | "wrapped_dek_pw_iv">> {
  const dekBytes = new Uint8Array(await crypto.subtle.exportKey("raw", dek));
  const salt = randomBytes(SALT_BYTES);
  const kek = await deriveKek(password, salt);
  const w = await aesEncrypt(kek, dekBytes);
  return { kdf_salt_pw: toB64(salt), wrapped_dek_pw: w.ct, wrapped_dek_pw_iv: w.iv };
}

export async function encryptState(
  dek: CryptoKey,
  state: unknown,
): Promise<{ ciphertext: string; ciphertext_iv: string }> {
  const { ct, iv } = await aesEncrypt(dek, textEncoder.encode(JSON.stringify(state)));
  return { ciphertext: ct, ciphertext_iv: iv };
}

export async function decryptState<T>(dek: CryptoKey, ciphertext: string, iv: string): Promise<T> {
  const bytes = await aesDecrypt(dek, ciphertext, iv);
  return JSON.parse(textDecoder.decode(bytes)) as T;
}
