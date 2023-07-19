"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const parse_balance_map_1 = require("./parse-balance-map");
const cors_1 = __importDefault(require("cors"));
const esm_1 = __importDefault(require("esm"));
// Enable ES modules support
(0, esm_1.default)(module);
// Import `ipfs-http-client` using the `esm` loader
const { create } = require('ipfs-http-client');
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY;
const projectId = process.env.INFURA_PROJECT_ID;
const projectSecret = process.env.INFURA_PROJECT_SECRET;
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
const ipfs = create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth,
    }
});
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.headers['api-key'];
    if (apiKey && apiKey === API_KEY) {
        next(); // Proceed to the next middleware or route handler
    }
    else {
        res.status(401).json({ error: 'Invalid API key' });
    }
};
app.use(apiKeyMiddleware);
app.use((0, cors_1.default)());
app.post('/api/merkle', (req, res) => {
    const { recipient, tokenDecimal } = req.body;
    let json = {};
    try {
        for (let i = 0; i < recipient.length; i++) {
            if (json[recipient[i].address] != undefined)
                throw new Error('Duplicate address');
            json[recipient[i].address] = (Math.ceil(recipient[i].amount * (Math.pow(10, tokenDecimal)))).toString(16);
        }
        res.status(200).send(JSON.stringify((0, parse_balance_map_1.parseBalanceMap)(json)));
    }
    catch (e) {
        return res.status(400).send(e);
    }
});
app.post('/api/merkleupload', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { recipient, tokenDecimal } = req.body;
    let json = {};
    try {
        for (let i = 0; i < recipient.length; i++) {
            if (json[recipient[i].address] != undefined)
                throw new Error('Duplicate address');
            json[recipient[i].address] = (Math.ceil(recipient[i].amount * (Math.pow(10, tokenDecimal)))).toString(16);
        }
        const merkleHash = JSON.stringify((0, parse_balance_map_1.parseBalanceMap)(json));
        console.log(merkleHash);
        const result = yield ipfs.add(merkleHash);
        res.status(200).send(result);
    }
    catch (e) {
        return res.status(500).send(e);
    }
}));
app.get('/', (_req, res) => {
    return res.send('Express Typescript on Vercel');
});
app.get('/ping', (_req, res) => {
    return res.send('pong 🏓');
});
app.listen(port, () => {
    return console.log(`Server is listening on ${port}`);
});
//# sourceMappingURL=index.js.map