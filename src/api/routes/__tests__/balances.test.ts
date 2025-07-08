import request from 'supertest';
import express from 'express';
import router from '../balances';
import { dbService } from '../../../db/schema';

jest.mock('../../../db/schema');
jest.mock('../../../utils/validation', () => ({
  validateAddressParam: jest.fn((data) => data),
  validateAssetQuery: jest.fn((data) => data),
  isValidAddress: jest.fn(() => true),
  isValidAsset: jest.fn(() => true)
}));
jest.mock('../../../middleware', () => ({
  addTraceContext: jest.fn((req, res, next) => {
    req.logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    next();
  }),
  errorHandler: jest.fn((err, req, res, next) => {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  })
}));

const app = express();
app.use(express.json());
app.use('/', router);

describe('Balances Routes', () => {
  it('GET /balance/:address returns balance for valid address and asset', async () => {
    const validAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
    const validAsset = 'USDC';
    (dbService.getBalance as jest.Mock).mockResolvedValue(1000);

    const response = await request(app)
      .get(`/balance/${validAddress}`)
      .query({ asset: validAsset })
      .expect(200);

    expect(response.body).toEqual({
      address: validAddress,
      asset: validAsset,
      balance: 1000
    });
  });

  it('GET /balance/:address/all returns all balances for valid address', async () => {
    const validAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
    const mockBalances = [
      { asset: 'USDC', balance: 1000 },
      { asset: 'ETH', balance: 5.5 }
    ];
    (dbService.getAllBalances as jest.Mock).mockResolvedValue(mockBalances);

    const response = await request(app)
      .get(`/balance/${validAddress}/all`)
      .expect(200);

    expect(response.body).toEqual({
      address: validAddress,
      balances: mockBalances,
      total: 2,
      timestamp: expect.any(String)
    });
  });
}); 