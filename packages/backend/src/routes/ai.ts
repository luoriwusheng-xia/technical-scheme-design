import { Router } from 'express';
import {
  generateStructuredOutput,
  type GenerateOptions,
} from '../services/structuredOutput.js';

const router = Router();

router.post('/generate', async (req, res) => {
  const { provider, schemaId, prompt, model, temperature } = req.body;

  const result = await generateStructuredOutput({
    provider,
    schemaId,
    prompt,
    model,
    temperature,
  } as GenerateOptions);

  res.json(result);
});

export default router;
