# Financial Health — mobile parity brief

> Hand-off for the **mobile** agent. Build the same encrypted financial-health
> feature the web app is building, sharing the same Supabase backend. Read
> `AGENTS.md` first. The web spec is the source of truth for product behavior;
> this file pins the parts that MUST match for cross-platform interop.

## What it is
A private **cash-flow workspace** living in the Profile area: the user enters
income (by timeframe) and categorized expenses; the app shows monthly
surplus/deficit + savings rate, and feeds a light projection into Goals. All
financial data is **zero-knowledge encrypted** — we store ciphertext only and
can never read it.

## Agreed decisions (match these)
- **Privacy:** zero-knowledge. Encrypt in the client; server stores ciphertext only.
- **Recovery:** one **recovery code** shown once at setup. Lost password + lost code = data is gone, by design. Say so plainly at setup.
- **Unlock:** seamless from the **login password** (email/password users). Derive the key in-app at sign-in; never store the password.
- **v1 scope = cash-flow core only.** Income + expenses → surplus + savings rate.
- **Phase 2 (web, live):** a **3-line cash-flow projection** (cumulative income, expenses, and the savings between them) shown on both Financial Health and Goals. Goals are marked on the savings line where it reaches each goal's remaining amount → funded-by date (read-only from `user_goals`). **Planned purchases** (house/car, with a down payment + target buy-month) are persisted in the vault blob (`purchases[]`) and *simulated* on the timeline — the savings line dips by the down payment at the buy-month and climbs slower afterward as the loan payment is added to expenses. See `src/lib/loanCalc.ts` (amortization) and `src/lib/financialProjection.ts` (`buildProjectionSeries`) for the exact math to mirror.
- **Placement:** a tab in Profile (`Overview | Financial Health`).
- **Goal link:** read-only. When unlocked with positive surplus, show per goal `(target − current) / monthly surplus → funded-by date`. Locked/no data → no projection.

## SHARED CRYPTO CONTRACT (must be byte-compatible with web)
Envelope encryption. A random **DEK** encrypts the data; the DEK is wrapped twice.
- **KDF:** PBKDF2-HMAC-**SHA-256**, **210,000** iterations, **16-byte** random salt, output **256-bit** key. (Separate salt for the password wrap and the recovery-code wrap.)
- **Cipher:** **AES-256-GCM**, **12-byte** random IV, 128-bit tag.
- **DEK:** 256-bit random (`AES-256-GCM` key).
- **Recovery code:** ≥128 bits entropy, shown grouped (e.g. base32). Normalize (strip spaces, uppercase) before deriving.
- **Encoding:** every binary value stored as **base64**. Payload = `AES-GCM(DEK, utf8(JSON.stringify(state)))`.
- **Versioning:** `version = 1`. Reject/upgrade other versions.

### Supabase table `user_financial_vault` (already RLS-scoped to `auth.uid()`)
```
user_id (PK, FK auth.users)         kdf_salt_pw, kdf_salt_rc    (base64)
wrapped_dek_pw, wrapped_dek_pw_iv   wrapped_dek_rc, wrapped_dek_rc_iv  (base64)
ciphertext, ciphertext_iv           (base64)
version (int)   created_at  updated_at
```
The DEK is NEVER stored. Last-write-wins on `ciphertext` across devices (acceptable v1).

### Plaintext shape (only ever decrypted in-app)
```jsonc
{
  "income":   [{ "id": "...", "label": "...", "amount": 0, "frequency": "weekly|biweekly|monthly|annual" }],
  "expenses": [{ "id": "...", "label": "...", "category": "...", "amount": 0, "frequency": "...", "fixed": true }], // label optional — web identifies expenses by category and omits the field; keep it nullable for parity
  "purchases": [{ "id": "...", "kind": "house|car", "label": "...", "targetDate": "YYYY-MM-01", "downPayment": 0, "monthlyPayment": 0, "termMonths": 0 }], // optional; planned future purchases simulated on the chart
  "meta": { "currency": "USD", "updatedAt": "ISO" }
}
```
Categories: Housing, Transport, Food, Utilities, Insurance, Debt, Healthcare, Discretionary, Savings, Other (+ custom). Derived values (monthly income/expense, surplus, savings rate, breakdown) are computed live, never stored.

## Mobile-specific stack
- React Native has no `crypto.subtle`. Use **`@noble/hashes/pbkdf2`** + **`@noble/ciphers/aes`** (pure-JS, audited, cross-platform) so the primitives match web exactly. (Alternative: `react-native-quick-crypto` for a node-`crypto` polyfill — fine if you prefer, but verify identical params/encoding.)
- **Native unlock upgrade:** because mobile has a secure keystore, you MAY store the unwrapped DEK in **expo-secure-store / Keychain** gated by **biometrics** so the vault stays unlocked seamlessly and supports Face/Touch unlock. This is a native enhancement, not a requirement — the security floor is still the zero-knowledge envelope above. Never persist the DEK in plain AsyncStorage.
- Routing: a `Financial Health` tab/segment in the Profile area (`expo-router`), mirroring the web tab.
- Charts: use the project's native chart lib (victory-native / react-native-svg) for the category breakdown.

## Edge cases / rules
- Wrong password/code on unlock → GCM auth fails → "Couldn't unlock — check your password or use your recovery code."
- **OAuth/social-login users** have no password to derive from → they set a dedicated **vault passphrase** at setup (the one exception to seamless).
- App relaunch with no cached key → prompt to unlock (or biometric, if you add it).
- Honesty rule (this app's whole point): never show fabricated numbers; if the vault is empty/locked, say so. Make the "we can't recover this" warning impossible to miss at setup.

## Verify
Round-trip test (encrypt→decrypt, wrong-key fails, recovery path works), then **cross-platform**: create a vault on web, confirm mobile decrypts it (and vice-versa). This is the real proof the crypto contract matches.
