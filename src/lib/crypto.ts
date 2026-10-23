/**
 * Cifra chaves de API das subcontas antes de gravar no banco (AES-256-GCM).
 * A chave vem de GATEWAY_KEYS_ENCRYPTION_KEY; qualquer texto longo serve,
 * porque derivamos 32 bytes com SHA-256. Só roda no servidor.
 *
 * Formato gravado: [versão 1 byte][iv 12 bytes][tag 16 bytes][dados cifrados]
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const VERSION = 1;

function deriveKey(secret?: string): Buffer {
  const value = secret ?? process.env.GATEWAY_KEYS_ENCRYPTION_KEY;
  if (!value || value.length < 32) {
    throw new Error('GATEWAY_KEYS_ENCRYPTION_KEY ausente ou curta demais (mínimo 32 caracteres)');
  }
  return createHash('sha256').update(value, 'utf8').digest();
}

export function encryptSecret(plaintext: string, secret?: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), data]);
}

export function decryptSecret(payload: Uint8Array, secret?: string): string {
  const buf = Buffer.from(payload);
  if (buf.length < 1 + 12 + 16 || buf[0] !== VERSION) throw new Error('Segredo cifrado em formato desconhecido');
  const iv = buf.subarray(1, 13);
  const tag = buf.subarray(13, 29);
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(buf.subarray(29)), decipher.final()]).toString('utf8');
}

/** Hash para comparar o token do webhook sem guardar o token em texto. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
