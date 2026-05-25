/**
 * PDF Encryption Module
 * Handles PDF encryption and decryption
 */

class PDFEncryptor {
  /**
   * Encrypt PDF with password
   */
  static async encryptPDF(file, password, options = {}) {
    const {
      ownerPassword = '',
      permissions = {
        printing: true,
        modifying: true,
        copying: true,
        annotating: true,
        fillingForms: true,
        contentAccessibility: true,
        documentAssembly: true
      }
    } = options;

    if (!password || password.trim() === '') {
      throw new Error('Password cannot be empty');
    }

    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);

      // Encrypt the PDF
      PDFHelper.encryptPDF(
        pdf,
        password,
        ownerPassword || password,
        permissions
      );

      const encryptedBytes = await PDFHelper.savePDF(pdf);
      return encryptedBytes;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt PDF with password
   * Note: This attempts to load with the provided password
   */
  static async decryptPDF(file, password) {
    if (!password || password.trim() === '') {
      throw new Error('Password cannot be empty');
    }

    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      
      // pdf-lib will automatically attempt decryption when loading
      const pdf = await PDFHelper.loadPDF(bytes);

      // If we got here, either the PDF wasn't encrypted or password was correct
      // Check if PDF is encrypted
      if (PDFHelper.isEncrypted(pdf)) {
        throw new Error('PDF is encrypted but password may be incorrect');
      }

      const decryptedBytes = await PDFHelper.savePDF(pdf);
      return decryptedBytes;
    } catch (error) {
      // Try with password parameter if available in PDFDocument
      try {
        const bytes = await FileHandler.readAsArrayBuffer(file);
        const { PDFDocument } = window.PDFLib;
        
        // Some versions of pdf-lib support password parameter
        const pdf = await PDFDocument.load(bytes, { password });
        
        const decryptedBytes = await PDFHelper.savePDF(pdf);
        return decryptedBytes;
      } catch (innerError) {
        throw new Error(`Decryption failed: Incorrect password or corrupted file`);
      }
    }
  }

  /**
   * Check if PDF is encrypted
   */
  static async isPDFEncrypted(file) {
    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);
      return PDFHelper.isEncrypted(pdf);
    } catch (error) {
      // If it throws an error about encryption, it's encrypted
      return error.message.includes('encrypted') || error.message.includes('password');
    }
  }

  /**
   * Create encrypted copy with specific permissions
   */
  static async createRestrictedCopy(file, password, restrictions = {}) {
    const {
      allowPrinting = true,
      allowModifying = false,
      allowCopying = false,
      allowAnnotating = false,
      allowFormFilling = false
    } = restrictions;

    const permissions = {
      printing: allowPrinting,
      modifying: allowModifying,
      copying: allowCopying,
      annotating: allowAnnotating,
      fillingForms: allowFormFilling
    };

    return this.encryptPDF(file, password, { permissions });
  }

  /**
   * Verify password (test without modifying)
   */
  static async verifyPassword(file, password) {
    if (!password || password.trim() === '') {
      return false;
    }

    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const { PDFDocument } = window.PDFLib;
      
      // Try to load with password
      const pdf = await PDFDocument.load(bytes, { password });
      
      // If successful, password is correct
      return true;
    } catch (error) {
      // Password incorrect or other error
      return false;
    }
  }
}

// PDFEncryptor is a global class — no export needed
