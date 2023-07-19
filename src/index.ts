import express, { Request, Response } from 'express'
import dotenv from 'dotenv';
import { parseBalanceMap } from './parse-balance-map'
import cors from 'cors';

dotenv.config();

const app = express()
const port = process.env.PORT || 8080
const API_KEY = process.env.API_KEY

app.use(express.json());
app.use(cors());

const apiKeyMiddleware = (req: Request, res: Response, next: () => void) => {
    const apiKey = req.headers['api-key'];

    if (apiKey && apiKey === API_KEY) {
      next(); // Proceed to the next middleware or route handler
    } else {
      res.status(401).json({ error: 'Invalid API key' });
    }
};

app.use(apiKeyMiddleware)
app.use(cors())

app.post('/api/merkle', (req, res) => {
    const { recipient, tokenDecimal } = req.body;

    let json: any = {};

    try {
        for (let i = 0; i < recipient.length; i++) {
            if (json[recipient[i].address] != undefined) throw new Error('Duplicate address');
            json[recipient[i].address] = (Math.ceil(recipient[i].amount * ( 10 ** tokenDecimal ))).toString(16);
        }

        res.status(200).send(JSON.stringify(parseBalanceMap(json)))
    }
    catch (e) {
        return res.status(400).send(e);
    }
  
    
});

app.get('/', (_req: Request, res: Response) => {
    return res.send('Express Typescript on Vercel')
})

app.get('/ping', (_req: Request, res: Response) => {
    return res.send('pong 🏓')
})

app.listen(port, () => {
    return console.log(`Server is listening on ${port}`)
})
