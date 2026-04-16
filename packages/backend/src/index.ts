import express from 'express';
import { env } from './config/env.js';
import aiRouter from './routes/ai.js';

const app = express();
app.use(express.json());

app.use('/api/ai', aiRouter);

app.listen(env.PORT, () => {
  console.log(`AIBlocks backend listening on port ${env.PORT} (${env.NODE_ENV})`);
});
