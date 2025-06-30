import express, { Request, Response } from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// // Routes
// app.get("/", (req: Request, res: Response) => {
//   res.json({ message: "Hello from TypeScript Express server!" });
// });

// app.get("/api/users", (req: Request, res: Response) => {
//   res.json({ users: ["John", "Jane", "Bob"] });
// });

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
