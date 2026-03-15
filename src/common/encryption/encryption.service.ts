import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private config: ConfigService) {
    const keyHex = this.config.get<string>('ENCRYPTION_KEY');
    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY debe ser exactamente 64 caracteres hex (32 bytes). Generar con: openssl rand -hex 32',
      );
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(value: string): string {
    const iv = randomBytes(12); // 96 bits — recomendado para AES-GCM
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag(); // 128 bits
    // Todos los componentes en hex — no contiene ':' por definición
    return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(value: string): string {
    if (!value || !value.startsWith('enc:')) return value; // campo no encriptado (migración)
    const parts = value.split(':');
    if (parts.length !== 4) {
      throw new Error('Formato de campo encriptado inválido');
    }
    const [, ivHex, authTagHex, encryptedHex] = parts;
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    // Buffer.concat + toString('utf8') para preservar caracteres multibyte (tildes, ñ, €)
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }
}
