import express, { Request, Response } from 'express'
import { parseBalanceMap } from './parse-balance-map'

const app = express()
const port = process.env.PORT || 8080

app.use(express.json());

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
