import express, { Request, Response } from 'express';

const app = express();
const port: number = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from Muscle Map 2D with TypeScript!');
});

app.listen(port, () => {
  console.log(`Muscle Map 2D server running on port ${port}`);
});