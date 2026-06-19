-- Zero-knowledge financial vault for the Profile "Financial Health" feature.
-- The server never holds the data-encryption key: all encrypt/decrypt happens
-- in the browser. RLS scopes each row to its owner, and even with full DB
-- access the contents are AES-256-GCM ciphertext.
--
-- Crypto contract (must match the mobile app — see docs/mobile/FINANCIAL_HEALTH.md):
--   KDF    PBKDF2-HMAC-SHA256, 210k iters, 16-byte salt, 256-bit key
--   Cipher AES-256-GCM, 12-byte IV
--   DEK    256-bit random, wrapped under the password-key and the recovery-key
CREATE TABLE public.user_financial_vault (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- KDF salts (base64) for the two key wraps.
  kdf_salt_pw TEXT NOT NULL,
  kdf_salt_rc TEXT NOT NULL,

  -- The data-encryption key, wrapped (AES-GCM ciphertext + IV, base64) by the
  -- password-derived key and by the recovery-code-derived key. The DEK itself
  -- is NEVER stored.
  wrapped_dek_pw TEXT NOT NULL,
  wrapped_dek_pw_iv TEXT NOT NULL,
  wrapped_dek_rc TEXT NOT NULL,
  wrapped_dek_rc_iv TEXT NOT NULL,

  -- The encrypted financial-state blob (base64 ciphertext + IV). Null until the
  -- user first saves data.
  ciphertext TEXT,
  ciphertext_iv TEXT,

  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_financial_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own financial vault"
  ON public.user_financial_vault FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_financial_vault
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.user_financial_vault IS 'Zero-knowledge encrypted financial-health data; server stores ciphertext only (no key).';
