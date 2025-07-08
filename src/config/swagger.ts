import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'uAsset Settlement API',
      version: '1.0.0',
      description: 'API for managing uAsset settlements and balances',
      contact: {
        name: 'API Support',
        email: 'support@uasset.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        SettlementRequest: {
          type: 'object',
          required: ['from', 'to', 'amount', 'asset'],
          properties: {
            from: {
              type: 'string',
              description: 'Sender Ethereum address',
              example: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
            },
            to: {
              type: 'string',
              description: 'Recipient Ethereum address',
              example: '0x8ba1f109551bD432803012645Hac136c772c3e3C'
            },
            amount: {
              type: 'number',
              description: 'Amount to transfer',
              example: 100
            },
            asset: {
              type: 'string',
              description: 'Asset symbol (USDC, USDT, ETH, BTC)',
              example: 'USDC'
            }
          }
        },
        SettlementResponse: {
          type: 'object',
          properties: {
            settlementId: {
              type: 'string',
              description: 'Unique settlement ID'
            },
            status: {
              type: 'string',
              description: 'Settlement status',
              enum: ['pending', 'confirmed', 'failed']
            }
          }
        },
        Balance: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Ethereum address'
            },
            asset: {
              type: 'string',
              description: 'Asset symbol'
            },
            balance: {
              type: 'number',
              description: 'Current balance'
            }
          }
        },
        AllBalances: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Ethereum address'
            },
            balances: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  asset: { type: 'string' },
                  balance: { type: 'number' }
                }
              }
            },
            total: {
              type: 'number',
              description: 'Number of assets'
            },
            timestamp: {
              type: 'string',
              description: 'ISO timestamp'
            }
          }
        },
        Settlement: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            amount: { type: 'number' },
            asset: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string' },
            confirmedAt: { type: 'string' }
          }
        },
        Asset: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            name: { type: 'string' },
            decimals: { type: 'number' },
            type: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        OrderRequest: {
          type: 'object',
          required: ['address', 'asset', 'side', 'amount', 'price', 'type'],
          properties: {
            address: {
              type: 'string',
              description: 'Ethereum address of the order creator',
              example: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
            },
            asset: {
              type: 'string',
              description: 'Asset symbol to trade',
              example: 'ETH'
            },
            side: {
              type: 'string',
              enum: ['buy', 'sell'],
              description: 'Order side'
            },
            amount: {
              type: 'number',
              description: 'Order amount',
              example: 1.5
            },
            price: {
              type: 'number',
              description: 'Order price',
              example: 2000
            },
            type: {
              type: 'string',
              enum: ['limit', 'market'],
              description: 'Order type'
            }
          }
        },
        OrderResponse: {
          type: 'object',
          properties: {
            orderId: { type: 'string' },
            status: { type: 'string' },
            address: { type: 'string' },
            asset: { type: 'string' },
            side: { type: 'string' },
            amount: { type: 'number' },
            price: { type: 'number' },
            type: { type: 'string' }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            address: { type: 'string' },
            asset: { type: 'string' },
            side: { type: 'string' },
            amount: { type: 'number' },
            remainingAmount: { type: 'number' },
            price: { type: 'number' },
            type: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        },
        OrderBookLevel: {
          type: 'object',
          properties: {
            price: { type: 'number' },
            totalAmount: { type: 'number' },
            orderCount: { type: 'number' }
          }
        },
        OrderBook: {
          type: 'object',
          properties: {
            asset: { type: 'string' },
            bids: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderBookLevel' }
            },
            asks: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderBookLevel' }
            },
            timestamp: { type: 'string' }
          }
        },
        Trade: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            buyOrderId: { type: 'string' },
            sellOrderId: { type: 'string' },
            asset: { type: 'string' },
            amount: { type: 'number' },
            price: { type: 'number' },
            buyerAddress: { type: 'string' },
            sellerAddress: { type: 'string' },
            timestamp: { type: 'string' }
          }
        },
        TradeResponse: {
          type: 'object',
          properties: {
            tradeId: { type: 'string' },
            orderId: { type: 'string' },
            trades: {
              type: 'array',
              items: { $ref: '#/components/schemas/Trade' }
            },
            remainingAmount: { type: 'number' }
          }
        }
      }
    }
  },
  apis: ['./src/api/routes/*.ts', './src/api/routes/index.ts'] // Path to the API routes
};

export const specs = swaggerJsdoc(options); 