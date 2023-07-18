import express, { Request, Response }  from 'express';

const app = express();
const port = 3000;

app.use((req: Request, res: Response, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.post('/api/endpoint', (req: Request, res: Response) => {
    const { name, email } = req.body;
  
    // Process the input data here
    // ...
  
    res.status(200).json({ message: 'Input received successfully' });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
