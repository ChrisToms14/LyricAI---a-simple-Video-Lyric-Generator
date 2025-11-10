import express from 'express';
import cors from 'cors';
import renderRouter from './render/route.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.use(cors({ origin: ['http://localhost:5173'], credentials: false }));
app.use('/api', renderRouter);

const port = Number(process.env.API_PORT || 5174);
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});