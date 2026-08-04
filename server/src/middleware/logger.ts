import morgan from 'morgan';
import { config } from '@/config';

export const morganMiddleware = morgan(config.nodeEnv === 'production' ? 'combined' : 'dev', {
  skip: (_req, res) => config.nodeEnv === 'production' && res.statusCode < 400,
  stream: {
    write: (message: string) => console.log(message.trim()),
  },
});
