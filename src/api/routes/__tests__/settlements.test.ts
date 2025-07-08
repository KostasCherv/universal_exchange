import request from 'supertest';
import express from 'express';
import router from '../settlements';
import { dbService } from '../../../db/schema';
import { redisService } from '../../../pubsub/redis';

jest.mock('../../../db/schema');
jest.mock('../../../pubsub/redis');
jest.mock('../../../utils/validation', () => ({
  validateSettlementRequest: jest.fn((data) => data),
  validateSettlementIdParam: jest.fn((data) => data),
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

describe('Settlements Routes', () => {
  it('POST /settle creates a settlement successfully', async () => {
    const validSettlementRequest = {
      from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      to: '0x8ba1f109551bD432803012645Hac136c772c3e3C',
      amount: 100,
      asset: 'USDC'
    };
    (dbService.createSettlement as jest.Mock).mockResolvedValue(undefined);
    (redisService.publishSettlementRequest as jest.Mock).mockResolvedValue(undefined);

    const response = await request(app)
      .post('/settle')
      .send(validSettlementRequest)
      .expect(202);

    expect(response.body).toHaveProperty('settlementId');
    expect(response.body.status).toBe('pending');
  });

  it('GET /settlements returns all settlements', async () => {
    const mockSettlements = [
      {
        id: 'uuid-1',
        from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        to: '0x8ba1f109551bD432803012645Hac136c772c3e3C',
        amount: 100,
        asset: 'USDC',
        status: 'confirmed',
        createdAt: '2024-01-01T00:00:00.000Z',
        confirmedAt: '2024-01-01T00:00:02.500Z'
      }
    ];
    (dbService.getSettlements as jest.Mock).mockResolvedValue(mockSettlements);

    const response = await request(app)
      .get('/settlements')
      .expect(200);

    expect(response.body).toEqual(mockSettlements);
  });
}); 