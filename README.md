# uAsset Exchange Backend System

A comprehensive backend system for a uAsset exchange platform that provides settlement, order management, and trading functionality. The system includes a REST API for settlements, orders, trades, and balance queries, with a simulated blockchain service and real-time trading engine.

## Features

- **REST API** for settlement operations, order management, and balance queries
- **Trading Engine** with order matching and trade execution
- **Order Management** with limit/market orders and cancellation
- **Simulated Blockchain Service** with configurable confirmation delays
- **Redis Pub/Sub** for asynchronous event handling
- **SQLite Database** for data persistence
- **Structured Logging** with trace IDs for debugging
- **Input Validation** using Zod schemas
- **TypeScript** for type safety
- **Docker Support** for containerization
- **Swagger Documentation** for API exploration

## Trading Engine

The system includes a sophisticated trading engine that handles:

- **Order Matching**: Automatically matches buy and sell orders based on price and time priority
- **Trade Execution**: Executes trades and updates user balances in real-time
- **Order Types**: Supports both limit and market orders
- **Partial Fills**: Handles partial order fills when matching orders have different amounts
- **Price Discovery**: Uses time-priority for price determination when orders match

### Order Status Flow

```
pending → partially_filled → filled
    ↓
cancelled
```

### Order Matching Logic

1. **Price Priority**: Orders are matched by best price first
2. **Time Priority**: Within the same price level, earlier orders are filled first
3. **Partial Fills**: Orders can be partially filled and remain in the order book
4. **Market Orders**: Market orders are filled immediately at the best available price

## Architecture Overview

Below is a simple architecture diagram of the backend:

```
[Order/Trade API]      [Settlement API]
      |                     |
      v                     v
[TradingEngine]     [BlockchainService]
      |                /    |
      |               /     v
      v              v    [Redis]
   [DatabaseService]
         |
         v
     [Database]
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- Redis server
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd uasset-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

4. Start Redis server (if not already running):
```bash
redis-server
```

5. Start the application:
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### POST /api/settle
Create a new settlement request.

**Request Body:**
```json
{
  "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "to": "0x8ba1f109551bD432803012645Hac136c772c3e3C",
  "amount": 100,
  "asset": "USDC"
}
```

**Response:**
```json
{
  "settlementId": "uuid-string",
  "status": "pending"
}
```

### GET /api/balance/:address
Get balance for a specific address and asset.

**Query Parameters:**
- `asset` (required): Asset symbol (e.g., USDC, ETH)

**Example:**
```
GET /api/balance/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6?asset=USDC
```

**Response:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "asset": "USDC",
  "balance": 1000
}
```

### GET /api/balance/:address/all
Get all balances for a specific address.

**Example:**
```
GET /api/balance/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6/all
```

**Response:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "balances": [
    {
      "asset": "USDC",
      "balance": 1000
    },
    {
      "asset": "ETH",
      "balance": 5.5
    }
  ],
  "total": 2,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/settlements
Get all settlements with their status.

**Response:**
```json
[
  {
    "id": "uuid-string",
    "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "to": "0x8ba1f109551bD432803012645Hac136c772c3e3C",
    "amount": 100,
    "asset": "USDC",
    "status": "confirmed",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "confirmedAt": "2024-01-01T00:00:02.500Z"
  }
]
```

### GET /api/settlements/:id
Get a specific settlement by ID.

**Example:**
```
GET /api/settlements/uuid-string
```

**Response:**
```json
{
  "id": "uuid-string",
  "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "to": "0x8ba1f109551bD432803012645Hac136c772c3e3C",
  "amount": 100,
  "asset": "USDC",
  "status": "confirmed",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "confirmedAt": "2024-01-01T00:00:02.500Z"
}
```

### GET /api/settlements/address/:address
Get all settlements involving a specific address.

**Example:**
```
GET /api/settlements/address/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
```

**Response:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "settlements": [
    {
      "id": "uuid-string",
      "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
      "to": "0x8ba1f109551bD432803012645Hac136c772c3e3C",
      "amount": 100,
      "asset": "USDC",
      "status": "confirmed",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "confirmedAt": "2024-01-01T00:00:02.500Z"
    }
  ],
  "total": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/assets
Get list of supported assets.

**Response:**
```json
{
  "assets": [
    {
      "symbol": "USDC",
      "name": "USD Coin",
      "decimals": 6,
      "type": "stablecoin"
    },
    {
      "symbol": "USDT",
      "name": "Tether USD",
      "decimals": 6,
      "type": "stablecoin"
    },
    {
      "symbol": "ETH",
      "name": "Ethereum",
      "decimals": 18,
      "type": "cryptocurrency"
    },
    {
      "symbol": "BTC",
      "name": "Bitcoin",
      "decimals": 8,
      "type": "cryptocurrency"
    }
  ],
  "total": 4,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Order Management API

### POST /api/orders
Create a new order (limit or market).

**Request Body:**
```json
{
  "address": "0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6",
  "asset": "ETH",
  "side": "buy",
  "amount": 1.5,
  "price": 2000,
  "type": "limit"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tradeId": "trade-1234567890",
    "orderId": "order-1234567890",
    "trades": [],
    "remainingAmount": 1.5
  }
}
```

### GET /api/orders
Get orders with optional filters.

**Query Parameters:**
- `address` (optional): Filter by Ethereum address
- `status` (optional): Filter by order status (pending, filled, cancelled, etc.)

**Example:**
```
GET /api/orders?address=0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6&status=pending
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order-1234567890",
      "address": "0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6",
      "asset": "ETH",
      "side": "buy",
      "amount": 1.5,
      "remainingAmount": 1.5,
      "price": 2000,
      "type": "limit",
      "status": "pending",
      "createdAt": "2024-01-01T12:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### GET /api/orders/:id
Get a specific order by ID.

**Example:**
```
GET /api/orders/order-1234567890
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-1234567890",
    "address": "0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6",
    "asset": "ETH",
    "side": "buy",
    "amount": 1.5,
    "remainingAmount": 1.5,
    "price": 2000,
    "type": "limit",
    "status": "pending",
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  }
}
```

### POST /api/orders/:id/cancel
Cancel an order.

**Example:**
```
POST /api/orders/order-1234567890/cancel
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

### GET /api/orders/book/:asset
Get order book for a specific asset.

**Example:**
```
GET /api/orders/book/ETH
```

**Response:**
```json
{
  "success": true,
  "data": {
    "asset": "ETH",
    "bids": [
      {
        "price": 2000,
        "totalAmount": 2.5,
        "orderCount": 3
      },
      {
        "price": 1999,
        "totalAmount": 1.0,
        "orderCount": 1
      }
    ],
    "asks": [
      {
        "price": 2001,
        "totalAmount": 1.5,
        "orderCount": 2
      }
    ],
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## Trading API

### GET /api/trades
Get trade history with optional filters.

**Query Parameters:**
- `asset` (optional): Filter by asset symbol
- `address` (optional): Filter by Ethereum address (buyer or seller)

**Example:**
```
GET /api/trades?asset=ETH&address=0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "trade-1234567890",
      "buyOrderId": "order-buy-123",
      "sellOrderId": "order-sell-456",
      "asset": "ETH",
      "amount": 1.0,
      "price": 2000,
      "buyerAddress": "0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6",
      "sellerAddress": "0x8ba1f109551bd432803012645aac136c772c3e3c",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

## API Documentation

Interactive API documentation is available at `/api-docs` when the server is running.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | SQLite database path | `./uasset.db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `LOG_LEVEL` | Logging level | `info` |
| `NODE_ENV` | Node environment | `development` |

## Development

### Project Structure

```
src/
├── api/
│   ├── routes.ts          # Main routes configuration
│   └── routes/            # Modular route files
│       ├── index.ts       # Routes index
│       ├── settlements.ts # Settlement endpoints
│       ├── balances.ts    # Balance endpoints
│       ├── assets.ts      # Asset endpoints
│       ├── orders.ts      # Order management endpoints
│       ├── trades.ts      # Trade history endpoints
│       └── health.ts      # Health check endpoint
├── config/
│   └── swagger.ts         # Swagger configuration
├── db/
│   └── schema.ts          # Database schema and operations
├── middleware/
│   └── index.ts           # Express middleware
├── pubsub/
│   └── redis.ts           # Redis Pub/Sub service
├── services/
│   ├── blockchain.ts      # Simulated blockchain service
│   └── trading-engine.ts  # Trading engine with order matching
├── types/
│   ├── index.ts           # TypeScript interfaces
│   └── express.d.ts       # Express type extensions
├── utils/
│   ├── logger.ts          # Logging utilities
│   └── validation.ts      # Input validation
└── index.ts               # Application entry point
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- src/api/routes/__tests__/orders.test.ts
npm test -- src/services/__tests__/trading-engine.test.ts

# Run tests in watch mode
npm run test:watch
```

The test suite includes:
- Route tests for all API endpoints
- Trading engine tests for order matching logic
- Database operation tests
- Validation and error handling tests

## Docker

### Build and Run

```bash
# Build the image
docker build -t uasset-backend .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL=./uasset.db \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  uasset-backend
```

### Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    volumes:
      - ./data:/app/data

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

Run with:
```bash
docker-compose up -d
```

## Monitoring and Debugging

### Logging

The application uses structured logging with Winston. Each request gets a unique trace ID for debugging.

Log levels:
- `error` - Errors and exceptions
- `warn` - Warning messages
- `info` - General information
- `debug` - Detailed debugging information

### Metrics

The system tracks:
- Total settlements processed
- Failed settlements
- Confirmation time per settlement
- Settlement volume per asset

### Health Checks

Use the `/health` endpoint to monitor application health.

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "statusCode": 400
}
```

Common error codes:
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Security

- Input validation using Zod schemas
- CORS enabled
- Helmet.js for security headers
- Rate limiting (can be added)
- Request size limits

## Performance

- Database indexes on frequently queried columns
- Connection pooling for database and Redis
- Asynchronous processing for settlements
- Graceful shutdown handling

## License

MIT License

## Further Improvements

Here are the top 5 most important next steps to enhance the backend:

1. **Add Real-Time Updates**
   - Use WebSockets or Socket.IO for live order book and trade notifications.

2. **Implement Authentication**
   - Add user accounts and secure endpoints with JWT-based authentication.

3. **Improve API Pagination & Filtering**
   - Support pagination and filtering for all list endpoints to handle large data sets.

4. **Add End-to-End (E2E) Tests**
   - Simulate real user flows to ensure the system works as expected.

5. **Enhance Monitoring & Logging**
   - Integrate metrics and better logging for easier debugging and system health tracking. 