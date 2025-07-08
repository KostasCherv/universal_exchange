# uAsset Settlement Backend System

A backend system that simulates a blockchain settlement engine for multiple uAssets. The system provides a REST API for initiating settlements and querying balances, and uses a simulated blockchain service to emit and confirm events.

## Features

- **REST API** for settlement operations and balance queries
- **Simulated Blockchain Service** with configurable confirmation delays
- **Redis Pub/Sub** for asynchronous event handling
- **SQLite Database** for data persistence
- **Structured Logging** with trace IDs for debugging
- **Input Validation** using Zod schemas
- **TypeScript** for type safety
- **Docker Support** for containerization

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   API       │    │  Blockchain │
│             │◄──►│   Service   │◄──►│  Service    │
└─────────────┘    └─────────────┘    └─────────────┘
                          │                    │
                          ▼                    ▼
                   ┌─────────────┐    ┌─────────────┐
                   │   SQLite    │    │    Redis    │
                   │  Database   │    │   Pub/Sub   │
                   └─────────────┘    └─────────────┘
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

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

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
│       └── health.ts      # Health check endpoint
├── db/
│   └── schema.ts          # Database schema and operations
├── middleware/
│   └── index.ts           # Express middleware
├── pubsub/
│   └── redis.ts           # Redis Pub/Sub service
├── services/
│   └── blockchain.ts      # Simulated blockchain service
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
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

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

Use the `/api/health` endpoint to monitor application health.

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## License

MIT License 