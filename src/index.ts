import express, { Request, Response } from 'express'
import dotenv from 'dotenv'
import { parseBalanceMap } from './parse-balance-map'
import cors from 'cors'
import esm from 'esm'

// Enable ES modules support
esm(module);

// Import `ipfs-http-client` using the `esm` loader
const { create, CID } = require('ipfs-http-client');

dotenv.config();

const app = express()
const port = process.env.PORT || 8080
const API_KEY = process.env.API_KEY
const projectId = process.env.INFURA_PROJECT_ID
const projectSecret = process.env.INFURA_PROJECT_SECRET
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64')
const address_limit = process.env.ADDRESS_LIMIT || 1

const ipfs = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth,
    }  
});

app.use(express.json());
app.use(cors());

const apiKeyMiddleware = (req: Request, res: Response, next: () => void) => {
    const apiKey = req.headers['api-key'];

    if (apiKey && apiKey === API_KEY) {
        next(); // Proceed to the next middleware or route handler
    } else {
        console.warn('Attempted request failing API_KEY received from ' + req.ip)
        res.status(401).json({ error: 'Invalid API key' });
    }
};

app.use(apiKeyMiddleware)
app.use(cors())

app.post('/api/merkle', (req, res) => {
    const { recipient, tokenDecimal } = req.body;

    if (recipient.length > address_limit) {
        return res.status(400).send('Too many addresses')
    }

    let json: any = {};

    try {
        for (let i = 0; i < recipient.length; i++) {
            if (json[recipient[i].address] != undefined) throw new Error('Duplicate address');
            json[recipient[i].address] = (Math.ceil(recipient[i].amount * ( 10 ** tokenDecimal ))).toString(16);
        }

        console.info('Successful request received for /api/merkle from ' + req.ip)
        return res.status(200).send(JSON.stringify(parseBalanceMap(json)))
    }
    catch (e) {
        console.warn('Failed request received for /api/merkle from ' + req.ip)
        return res.status(400).send(e);
    }
});

app.post('/api/merkleupload', async (req, res) => {
    const { recipient, tokenDecimal } = req.body;

    if (recipient.length > address_limit) {
        console.warn('Failed request received for /api/merkleupload from ' + req.ip)
        return res.status(400).send('Too many addresses')
    }

    let json: any = {};

    try {
        for (let i = 0; i < recipient.length; i++) {
            if (json[recipient[i].address] != undefined) throw new Error('Duplicate address');
            json[recipient[i].address] = (Math.ceil(recipient[i].amount * ( 10 ** tokenDecimal ))).toString(16);
        }

        const merkleHash = JSON.stringify(parseBalanceMap(json))
        const result = await ipfs.add(merkleHash);

        console.info('Successful request received for /api/merkleupload from ' + req.ip)
        return res.status(200).send(result)
    }
    catch (e) {
        console.warn('Failed request received for /api/merkleupload from ' + req.ip)
        return res.status(500).send(e);
    }
});

app.get('/api/fetchcids', async (_req: Request, res: Response) => {
    let json: any = {};

    try {
        const pins = await ipfs.pin.ls()

        for await (const { cid, type } of pins) {
            json["cid"] = cid.toString()
            json["type"] = type
        }

        console.info('Successful request received for /api/fetchcids from ' + _req.ip)
        return res.send(json)
    } catch (error) {
        console.warn('Failed request received for /api/fetchcids from ' + _req.ip)
        return res.status(400).send('Failed to retrieve pinned items:' + error);
    }
})

app.get('/', (_req: Request, res: Response) => {
    console.info('Successful request received for / from ' + _req.ip)
    return res.send('Express Typescript on Vercel')
})

app.get('/ping', (_req: Request, res: Response) => {
    console.info('Successful request received for /ping from ' + _req.ip)
    return res.send('pong 🏓')
})

app.listen(port, () => {
    return console.log(`Server is listening on ${port}`)
})
