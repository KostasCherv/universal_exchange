import request from 'supertest';
import express from 'express';
import router from '../health';

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

describe('Health Route', () => {
  it('GET /health returns status ok and timestamp', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body).toEqual({
      status: 'ok',
      timestamp: expect.any(String)
    });
  });
}); 