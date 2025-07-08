import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { logger } from '../utils/logger';

export class DatabaseService {
  private db: Database | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await open({
        filename: process.env.DATABASE_URL || './uasset.db',
        driver: sqlite3.Database
      });

      await this.createTables();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database', { error });
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create balances table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS balances (
        address TEXT NOT NULL,
        asset TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (address, asset)
      )
    `);

    // Create settlements table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS settlements (
        id TEXT PRIMARY KEY,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        amount REAL NOT NULL,
        asset TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        confirmed_at DATETIME NULL
      )
    `);

    // Create indexes for better performance
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
      CREATE INDEX IF NOT EXISTS idx_settlements_asset ON settlements(asset);
      CREATE INDEX IF NOT EXISTS idx_settlements_created_at ON settlements(created_at);
    `);

    logger.info('Database tables created successfully');
    
    // Seed initial test balances
    await this.seedTestBalances();
  }

  private async seedTestBalances(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Check if balances already exist
      const existingBalances = await this.db.all('SELECT COUNT(*) as count FROM balances');
      if (existingBalances[0]?.count > 0) {
        logger.info('Test balances already exist, skipping seed');
        return;
      }

      // Test addresses
      const testAddresses = [
        '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
        '0x8ba1f109551bd432803012645aac136c772c3e3c',
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      ];

      // Test assets and balances
      const testBalances = [
        // Address 1 - Rich in USDC and ETH
        { address: testAddresses[0], asset: 'USDC', balance: 10000 },
        { address: testAddresses[0], asset: 'ETH', balance: 50 },
        { address: testAddresses[0], asset: 'BTC', balance: 2 },
        
        // Address 2 - Rich in USDT and DAI
        { address: testAddresses[1], asset: 'USDT', balance: 15000 },
        { address: testAddresses[1], asset: 'DAI', balance: 8000 },
        { address: testAddresses[1], asset: 'ETH', balance: 25 },
        
        // Address 3 - Moderate balances
        { address: testAddresses[2], asset: 'USDC', balance: 2500 },
        { address: testAddresses[2], asset: 'USDT', balance: 3000 },
        { address: testAddresses[2], asset: 'BTC', balance: 0.5 },
        
        // Address 4 - Small balances
        { address: testAddresses[3], asset: 'USDC', balance: 500 },
        { address: testAddresses[3], asset: 'ETH', balance: 1.5 },
        { address: testAddresses[3], asset: 'DAI', balance: 1000 }
      ];

      // Insert test balances
      for (const balance of testBalances) {
        await this.db.run(
          'INSERT OR REPLACE INTO balances (address, asset, balance) VALUES (?, ?, ?)',
          [balance.address, balance.asset, balance.balance]
        );
      }

      logger.info('Test balances seeded successfully', { 
        addresses: testAddresses.length, 
        balances: testBalances.length 
      });
    } catch (error) {
      logger.error('Failed to seed test balances', { error });
      // Don't throw error to avoid breaking initialization
    }
  }

  async getBalance(address: string, asset: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.get(
      'SELECT balance FROM balances WHERE address = ? AND asset = ?',
      [address, asset]
    );

    return result?.balance || 0;
  }

  async getAllBalances(address: string): Promise<Array<{
    asset: string;
    balance: number;
  }>> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.all(
      'SELECT asset, balance FROM balances WHERE address = ? ORDER BY asset',
      [address]
    );

    return results || [];
  }

  async updateBalance(address: string, asset: string, balance: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      'INSERT OR REPLACE INTO balances (address, asset, balance) VALUES (?, ?, ?)',
      [address, asset, balance]
    );
  }

  async createSettlement(settlement: {
    id: string;
    from: string;
    to: string;
    amount: number;
    asset: string;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      'INSERT INTO settlements (id, from_address, to_address, amount, asset, status) VALUES (?, ?, ?, ?, ?, ?)',
      [settlement.id, settlement.from, settlement.to, settlement.amount, settlement.asset, 'pending']
    );
  }

  async updateSettlementStatus(id: string, status: 'confirmed' | 'failed'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const confirmedAt = status === 'confirmed' ? new Date().toISOString() : null;
    
    await this.db.run(
      'UPDATE settlements SET status = ?, confirmed_at = ? WHERE id = ?',
      [status, confirmedAt, id]
    );
  }

  async getSettlements(): Promise<Array<{
    id: string;
    from: string;
    to: string;
    amount: number;
    asset: string;
    status: string;
    createdAt: string;
    confirmedAt: string | null;
  }>> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.all(
      'SELECT id, from_address as "from", to_address as "to", amount, asset, status, created_at as createdAt, confirmed_at as confirmedAt FROM settlements ORDER BY created_at DESC'
    );
  }

  async getSettlementById(id: string): Promise<{
    id: string;
    from: string;
    to: string;
    amount: number;
    asset: string;
    status: string;
    createdAt: string;
    confirmedAt: string | null;
  } | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.get(
      'SELECT id, from_address as "from", to_address as "to", amount, asset, status, created_at as createdAt, confirmed_at as confirmedAt FROM settlements WHERE id = ?',
      [id]
    );

    return result || null;
  }

  async getSettlementsByAddress(address: string): Promise<Array<{
    id: string;
    from: string;
    to: string;
    amount: number;
    asset: string;
    status: string;
    createdAt: string;
    confirmedAt: string | null;
    role: 'sender' | 'receiver';
  }>> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.all(
      `SELECT 
        id, 
        from_address as "from", 
        to_address as "to", 
        amount, 
        asset, 
        status, 
        created_at as createdAt, 
        confirmed_at as confirmedAt,
        CASE 
          WHEN from_address = ? THEN 'sender'
          WHEN to_address = ? THEN 'receiver'
        END as role
      FROM settlements 
      WHERE from_address = ? OR to_address = ? 
      ORDER BY created_at DESC`,
      [address, address, address, address]
    );

    return results || [];
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

export const dbService = new DatabaseService(); 