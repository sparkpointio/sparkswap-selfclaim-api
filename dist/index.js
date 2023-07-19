"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const parse_balance_map_1 = require("./parse-balance-map");
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
app.use(express_1.default.json());
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