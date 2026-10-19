/**
 * PDF Encryption Module
 * Real encryption / decryption / password-removal via @cantoo/pdf-lib.
 */

class PDFEncryptor {
  /**
   * Encrypt bytes with a user password (AES-256).
   * @returns {Promise<Uint8Array>}
   */
  static async encrypt(bytes, userPassword, opts = {}) {
    if (!userPassword || userPassword.trim() === '') {
      throw new Error('Password cannot be empty');
    }
    const { ownerPassword = '', permissions = {} } = opts;
    const pdf = await PDFHelper.loadPDF(bytes);
    PDFHelper.encrypt(pdf, userPassword, ownerPassword || userPassword, permissions);
    return PDFHelper.savePDF(pdf);
  }

  /**
   * Remove protection using a known password (or empty for permissions-only).
   * Re-saves without encryption.
   * @returns {Promise<Uint8Array>}
   */
  static async decrypt(bytes, password = '') {
    const { PDFDocument } = PDFHelper.lib;
    let pdf;
    try {
      pdf = await PDFDocument.load(PDFHelper._copy(bytes), { password, updateMetadata: false });
    } catch (error) {
      if (PDFHelper.isPasswordError(error) || PDFHelper.isEncryptionError(error)) {
        throw new Error('Incorrect password');
      }
      throw new Error(`Could not open PDF: ${error.message}`);
    }
    // Drop the old security handler so the saved copy is genuinely unencrypted.
    PDFHelper.stripEncryptionArtifacts(pdf);
    return PDFHelper.savePDF(pdf);
  }

  /**
   * Unlock a permissions-only PDF (owner password set, empty user password)
   * without needing any password.
   * @returns {Promise<Uint8Array>}
   */
  static async removeRestrictions(bytes) {
    return this.decrypt(bytes, '');
  }

  /**
   * Try a list of candidate passwords (for "I forgot which one it was").
   * @returns {Promise<{password:string, bytes:Uint8Array}|null>}
   */
  static async tryPasswords(bytes, candidates, opts = {}) {
    const { onProgress = null } = opts;
    const list = [''].concat(candidates.filter(c => c !== ''));
    for (let i = 0; i < list.length; i++) {
      const pw = list[i];
      try {
        const out = await this.decrypt(bytes, pw);
        return { password: pw, bytes: out };
      } catch (_) { /* keep trying */ }
      if (onProgress) onProgress({ processed: i + 1, total: list.length, percent: Math.round(((i + 1) / list.length) * 100) });
    }
    return null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFEncryptor;
}
