import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import { putAllAuthHandler, putAuthHandler, modelServerProxy } from './modelix';
import morgan from 'morgan';

dotenv.config();

const app = express();

// app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.json({ type: '*/*', limit: '5000mb' }));
app.put('/put', putAuthHandler());
app.put('/putAll', putAllAuthHandler());
app.use(modelServerProxy());

const port = Number(process.env.PORT ?? 8008);
const hostname: string = process.env.HOST ?? 'localhost';
app.listen(port, hostname, () => {
  console.log(`Proxy running at ${hostname}:${port}`);
});
