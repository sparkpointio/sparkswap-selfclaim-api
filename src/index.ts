import express, { Request, Response }  from 'express';

const app = express();
const port = 3000;

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
