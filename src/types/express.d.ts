declare namespace Express {
  interface Request {
    traceId?: string;
    logger?: {
      info: (message: string, meta?: any) => void;
      error: (message: string, meta?: any) => void;
      warn: (message: string, meta?: any) => void;
      debug: (message: string, meta?: any) => void;
    };
  }
} 