require("dotenv").config();
import express from "express";
import Groq from "groq-sdk";
import cors from "cors";
import { BASE_PROMPT, getSystemPrompt } from "./prompts";
import { basePrompt as reactBasePrompt } from "./defaults/react";
import { basePrompt as nodeBasePrompt } from "./defaults/node";

// hit the template route to get the template --- node or react
// hit the chat route to get the chat  streamline it

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());

//first route
app.post("/template", async (req, res) => {
  const prompt = req.body.prompt;
  const response = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "Respond with a single word, either node or 'react', indicating the technology that should be used for this project.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "llama3-70b-8192",
    max_tokens: 20,
    temperature: 0.0000001,
  });
  console.log(response.choices[0].message);
  const ans = response.choices[0].message.content
    ?.toLowerCase()
    .trim()
    .split(" ")[0]
    .replace(/[^a-z]/g, ""); // node or react
  console.log(ans);
  if (ans === "react") {
    res.json({
      prompts: [
        BASE_PROMPT,
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [reactBasePrompt],
    });

    return;
  }

  if (ans === "nodejs" || ans === "node") {
    res.json({
      prompts: [
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [nodeBasePrompt],
    });

    return;
  }
  /// nothing works

  res.status(403).json({
    message: "You can't do that",
  });

  return;
});

app.post("/chat", async (req, res) => {
  const messages = req.body.messages;
  const systemprompt = getSystemPrompt();
  const responseStream = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemprompt,
      },
      ...messages,
    ],
    model: "llama3-70b-8192",
    max_tokens: 8000,
    stream: true,
  });
  const responseChunks = [];
  for await (const chunk of responseStream) {
    responseChunks.push(chunk);
  }
  const responseBody = responseChunks
    .flatMap((chunk) => chunk.choices.map((choice) => choice.delta.content))
    .join("");

  res.json({
    response: responseBody,
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
