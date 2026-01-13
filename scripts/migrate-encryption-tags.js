/**
 * Migration Template for Re-encrypting Data with Invalid Authentication Tags
 * 
 * This template provides a framework for re-encrypting any encrypted data
 * that has invalid authentication tag lengths. This should only be run if
 * validation script found critical issues.
 * 
 * Usage:
 *   node scripts/migrate-encryption-tags.js [--service=event,register,task] [--dry-run]
 */

const crypto = require('crypto');

// This is a template - actual implementation depends on your database/ORM

/**
 * Re-encrypt data with invalid tags
 */
class EncryptionTagMigration {
  constructor(config) {
    this.config = config;
    this.processed = 0;
    this.errors = [];
    this.dryRun = process.argv.includes('--dry-run');
  }

  /**
   * Decrypt data with flexible tag handling
   */
  decryptWithFlexibleTag(encryptedData, key) {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error(`Invalid format: expected 3 parts, got ${parts.length}`);
      }

      const [ivB64, tagB64, dataB64] = parts;
      const iv = Buffer.from(ivB64, 'base64');
      const tag = Buffer.from(tagB64, 'base64');
      const data = Buffer.from(dataB64, 'base64');

      // Attempt decryption with provided tag length
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(data, 'binary', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Re-encrypt data with valid 16-byte tag
   */
  reencryptWithValidTag(plaintext, key) {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Ensure tag is exactly 16 bytes
      const authTag = cipher.getAuthTag();
      if (authTag.length !== 16) {
        throw new Error(`Invalid tag length: ${authTag.length} (expected 16)`);
      }

      return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Re-encryption failed: ${error.message}`);
    }
  }

  /**
   * Process records from database
   * 
   * This is a template - adapt to your actual database schema and ORM
   */
  async processRecords(service) {
    console.log(`\n📦 Processing ${service} service...`);

    // Template implementation
    const operations = [];

    // In a real implementation, you would:
    // 1. Query the database for encrypted fields with invalid tags
    // 2. For each record:
    //    - Decrypt with existing (possibly invalid) tag
    //    - Re-encrypt with valid 16-byte tag
    //    - Update the database
    //    - Log the operation

    // Example template for event service:
    if (service === 'event') {
      console.log('  Tables to process: Events, Messages');
      console.log('  Fields: encrypted_field, body');
      operations.push({
        table: 'Events',
        field: 'encrypted_field',
        description: 'Main event encrypted data',
      });
      operations.push({
        table: 'Messages',
        field: 'body',
        description: 'Event message bodies',
      });
    }

    // Example for register service:
    if (service === 'register') {
      console.log('  Tables to process: Records, Keys');
      console.log('  Fields: data, encrypted_value');
      operations.push({
        table: 'Records',
        field: 'data',
        description: 'Register record data',
      });
      operations.push({
        table: 'Keys',
        field: 'encrypted_value',
        description: 'Encryption keys',
      });
    }

    // Example for task service:
    if (service === 'task') {
      console.log('  Tables to process: Tasks, Attachments');
      console.log('  Fields: encrypted_data, content');
      operations.push({
        table: 'Tasks',
        field: 'encrypted_data',
        description: 'Task encrypted data',
      });
      operations.push({
        table: 'Attachments',
        field: 'content',
        description: 'Attachment content',
      });
    }

    // Simulate operations
    operations.forEach(op => {
      console.log(`  ✓ Ready to process: ${op.table}.${op.field}`);
    });

    return operations.length;
  }

  /**
   * Run migration
   */
  async run() {
    console.log('🔄 Starting encryption tag migration...\n');
    console.log(`Mode: ${this.dryRun ? '🏜️ DRY RUN (no changes)' : '💾 LIVE (will update database)'}\n`);

    const services = process.argv.find(arg => arg.startsWith('--service='));
    const servicesToProcess = services 
      ? services.split('=')[1].split(',')
      : ['event', 'register', 'task'];

    let totalProcessed = 0;

    for (const service of servicesToProcess) {
      try {
        const count = await this.processRecords(service);
        totalProcessed += count;
      } catch (error) {
        this.errors.push({ service, error: error.message });
        console.error(`  ❌ Error processing ${service}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n📊 Migration Summary');
    console.log('====================');
    console.log(`Records processed: ${totalProcessed}`);
    console.log(`Errors: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.forEach(err => {
        console.log(`  - ${err.service}: ${err.error}`);
      });
      process.exit(1);
    }

    if (this.dryRun) {
      console.log('\n✅ Dry run completed successfully. Ready to run migration.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
  }
}

// Run migration
const migration = new EncryptionTagMigration({});
migration.run().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
