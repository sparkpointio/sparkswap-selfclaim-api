import express, { Request, Response } from 'express'
import dotenv from 'dotenv'
import { parseBalanceMap } from './parse-balance-map'
import cors from 'cors'
import esm from 'esm'
import Web3 from 'web3'
import { selfclaim_abi, erc20_abi } from './abi'

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

const web3 = new Web3(
    new Web3.providers.HttpProvider(
        process.env.WEB3_PROVIDER
    )
)

const airdropContract = new web3.eth.Contract(
    selfclaim_abi,
    process.env.SELFCLAIM_CONTRACT
)

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

app.post('/api/merkle', (req, res) => {
    const { recipient, tokenDecimal } = req.body;

    let json: any = {};

    try {
        if (recipient.length > address_limit) {
            throw new Error('Too many addresses')
        }

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

    let json: any = {};

    try {
        if (recipient.length > address_limit) {
            throw new Error('Too many addresses')
        }

        for (let i = 0; i < recipient.length; i++) {
            if (json[recipient[i].address] != undefined) throw new Error('Duplicate address');
            json[recipient[i].address] = (Math.ceil(recipient[i].amount * ( 10 ** tokenDecimal ))).toString(16);
        }

        const merkleHash = parseBalanceMap(json);
        const merkleHashStr = JSON.stringify(merkleHash);
        const result = await ipfs.add(merkleHashStr);

        console.info('Successful request received for /api/merkleupload from ' + req.ip)
        return res.status(200).send({
            "cidv0": result.cid.toString(),
            "cidv1": result.cid.toV1().toString(),
            "merkleRoot": merkleHash.merkleRoot
        })
    }
    catch (e) {
        console.warn('Failed request received for /api/merkleupload from ' + req.ip)
        return res.status(500).send(e);
    }
});

const fetchcids = async () => {
    let pinnedCids: any = [];

    try {
        const pins = await ipfs.pin.ls()

        for await (const { cid, type } of pins) {
            let json: any = {};
            json["cidv0"] = cid.toString()
            json["cidv1"] = cid.toV1().toString()
            json["type"] = type
            pinnedCids.push(json)
        }

        return pinnedCids
    }
    catch (error) {
        throw new Error('Failed to retrieve pinned items')
    }
}

app.get('/api/fetchcids', async (_req: Request, res: Response) => {
    let pinnedCids: any = [];

    try {
        pinnedCids = await fetchcids()

        console.info('Successful request received for /api/fetchcids from ' + _req.ip)
        return res.send({pinnedCids})
    } catch (error) {
        console.warn('Failed request received for /api/fetchcids from ' + _req.ip)
        return res.status(400).send('Failed to retrieve pinned items:' + error);
    }
})

const validateCID = (cidString: string): boolean => {
    try {
        const cid = CID.parse(cidString);
        return true;
    }   catch (error) {
        return false;
    }
}
  

app.post('/api/fetchproof', async (_req: Request, res: Response) => {
    const { cidv1, address } = _req.body;

    try {
        if (!validateCID(cidv1)) {
            throw new Error('Invalid CID')
        }

        const response = await fetch(`https://${cidv1}.ipfs.dweb.link/`);
        const jsonData = await response.json();
        
        if (!jsonData.claims[address]) {
            throw new Error('Address does not exist in proof')
        }

        console.info('Successful request received for /api/fetchcids from ' + _req.ip)
        return res.send(jsonData.claims[address])
    } catch (error) {
        console.warn('Failed request received for /api/fetchcids from ' + _req.ip)
        return res.status(400).send('Failed to retrieve proof:' + error);
    }
})

app.post('/api/fetchproofs', async (_req: Request, res: Response) => {
    let pinnedCids: any = []
    let ret: any = []
    const { address } = _req.body;

    try {
        pinnedCids = await fetchcids()

        for (const { cidv1 } of pinnedCids) {
            const response = await fetch(`https://${cidv1}.ipfs.dweb.link/`);
            const jsonData = await response.json()

            if (!jsonData.claims[address]) {
                continue
            }

            let airdropDetails: any = []

            const airdropIDs = await airdropContract.methods.airdropIDs(jsonData.merkleRoot).call()
            for (const airdropID of airdropIDs) {
                const airdrop = await airdropContract.methods.airdrop(airdropID).call()
                const tokenContract = new web3.eth.Contract(
                    erc20_abi,
                    airdrop.tokenAddress
                )
                const decimal = await tokenContract.methods.decimals().call()
                airdropDetails.push({
                    "id": airdropID,
                    "tokenAddress": airdrop.tokenAddress,
                    "tokenDecimal": decimal,
                    "totalAmount": airdrop.totalAmount,
                    "totalClaimed": airdrop.totalClaimed
                })
            }

            ret.push({
                "merkleRoot": jsonData.merkleRoot,
                "claims": jsonData.claims[address],
                "airdrops": airdropDetails
            })
        }
        
        console.info('Successful request received for /api/fetchproofs from ' + _req.ip)
        return res.send(ret)
    } catch (error) {
        console.warn('Failed request received for /api/fetchproofs from ' + _req.ip)
        return res.status(400).send('Failed to retrieve proof:' + error);
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
