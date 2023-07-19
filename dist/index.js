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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
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
const { create, CID } = require('ipfs-http-client');
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY;
const projectId = process.env.INFURA_PROJECT_ID;
const projectSecret = process.env.INFURA_PROJECT_SECRET;
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
const address_limit = process.env.ADDRESS_LIMIT || 1;
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
        console.warn('Attempted request failing API_KEY received from ' + req.ip);
        res.status(401).json({ error: 'Invalid API key' });
    }
};
app.use(apiKeyMiddleware);
app.use((0, cors_1.default)());
app.post('/api/merkle', (req, res) => {
    const { recipient, tokenDecimal } = req.body;
    if (recipient.length > address_limit) {
        return res.status(400).send('Too many addresses');
    }
    let json = {};
    try {
        for (let i = 0; i < recipient.length; i++) {
            if (json[recipient[i].address] != undefined)
                throw new Error('Duplicate address');
            json[recipient[i].address] = (Math.ceil(recipient[i].amount * (Math.pow(10, tokenDecimal)))).toString(16);
        }
        console.info('Successful request received for /api/merkle from ' + req.ip);
        return res.status(200).send(JSON.stringify((0, parse_balance_map_1.parseBalanceMap)(json)));
    }
    catch (e) {
        console.warn('Failed request received for /api/merkle from ' + req.ip);
        return res.status(400).send(e);
    }
});
app.post('/api/merkleupload', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { recipient, tokenDecimal } = req.body;
    if (recipient.length > address_limit) {
        console.warn('Failed request received for /api/merkleupload from ' + req.ip);
        return res.status(400).send('Too many addresses');
    }
    let json = {};
    try {
        for (let i = 0; i < recipient.length; i++) {
            if (json[recipient[i].address] != undefined)
                throw new Error('Duplicate address');
            json[recipient[i].address] = (Math.ceil(recipient[i].amount * (Math.pow(10, tokenDecimal)))).toString(16);
        }
        const merkleHash = JSON.stringify((0, parse_balance_map_1.parseBalanceMap)(json));
        const result = yield ipfs.add(merkleHash);
        console.info('Successful request received for /api/merkleupload from ' + req.ip);
        return res.status(200).send(result);
    }
    catch (e) {
        console.warn('Failed request received for /api/merkleupload from ' + req.ip);
        return res.status(500).send(e);
    }
}));
app.get('/api/fetchcids', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    let json = {};
    try {
        const pins = yield ipfs.pin.ls();
        try {
            for (var _d = true, pins_1 = __asyncValues(pins), pins_1_1; pins_1_1 = yield pins_1.next(), _a = pins_1_1.done, !_a; _d = true) {
                _c = pins_1_1.value;
                _d = false;
                const { cid, type } = _c;
                json["cid"] = cid.toString();
                json["type"] = type;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = pins_1.return)) yield _b.call(pins_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        console.info('Successful request received for /api/fetchcids from ' + _req.ip);
        return res.send(json);
    }
    catch (error) {
        console.warn('Failed request received for /api/fetchcids from ' + _req.ip);
        return res.status(400).send('Failed to retrieve pinned items:' + error);
    }
}));
app.get('/', (_req, res) => {
    console.info('Successful request received for / from ' + _req.ip);
    return res.send('Express Typescript on Vercel');
});
app.get('/ping', (_req, res) => {
    console.info('Successful request received for /ping from ' + _req.ip);
    return res.send('pong 🏓');
});
app.listen(port, () => {
    return console.log(`Server is listening on ${port}`);
});
//# sourceMappingURL=index.js.map