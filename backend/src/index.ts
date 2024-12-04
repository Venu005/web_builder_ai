require("dotenv").config();
import express from "express";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import { basePrompt as nodeBasePrompt } from "./defaults/node";
import { basePrompt as reactBasePrompt } from "./defaults/react";
import OpenAI from "openai";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
const anthropic = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post("/template", async (req, res) => {
  const prompt = req.body.prompt;

  const response = await anthropic.chat.completions.create({
    messages: [
      {
        role: "user",
        content: prompt,
      },
      {
        role: "system",
        content:
          "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra",
      },
    ],
    model: "anthropic/claude-3.5-haiku:beta",
    max_tokens: 200,
  });

  const answer = response.choices[0].message.content?.toLowerCase(); // react or node
  console.log(answer);
  if (answer == "react") {
    res.json({
      prompts: [
        BASE_PROMPT,
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [reactBasePrompt],
    });
    return;
  }

  if (answer === "node") {
    res.json({
      prompts: [
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [nodeBasePrompt],
    });
    return;
  }

  res.status(403).json({ message: "You cant access this" });
  return;
});

app.post("/chat", async (req, res) => {
  const messages = req.body.messages;
  const response = await anthropic.chat.completions.create({
    messages: [
      {
        role: "system",
        content: getSystemPrompt(),
      },
      ...messages,
    ],
    model: "anthropic/claude-3.5-haiku:beta",
    max_tokens: 7000,
  });

  //console.log(response);
  //console.log(response.choices[0].message.content);

  res.json({
    response: response.choices[0].message.content,
  });
});

app.listen(3000);
