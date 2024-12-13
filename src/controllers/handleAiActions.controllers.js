import { config } from "dotenv";
config({
    path: "./././.env",
});
import { BASE_PROMPT, getSystemPrompt } from "../helper/prompt.js";
import { nodeBasePrompt, reactBasePrompt } from "../helper/defaultPrompts.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const model = geminiClient.getGenerativeModel({
    model: "gemini-1.5-flash",
});

const handleCheckAiTemplate = async (req, res) => {
    const prompt = req.body.prompt;

    if (!prompt) {
        return res.status(400).json({
            message: "Prompt is required",
            status: 400,
        });
    }

    try {
        const defaultPrompts = `${prompt}
        from above prompt Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra.`;

        const response = await model.generateContent(defaultPrompts);

        const answer = response.response.text().trim().toLowerCase();

        if (answer === "react") {
            return res.json({
                prompts: [
                    BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [reactBasePrompt],
            });
        } else if (answer === "node") {
            return res.json({
                prompts: [
                    BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [nodeBasePrompt],
            });
        }

        return res.status(403).json({ message: "Unexpected response from AI model. Access denied." });
    } catch (error) {
        console.error("Error handling AI template:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


const handleChatWithGemini = async (req, res) => {
    try {
        const userMessages = req.body.messages;
        if (!userMessages || !Array.isArray(userMessages)) {
            return res
                .status(400)
                .json({ message: "Invalid or missing messages." });
        }

        const model = geminiClient.getGenerativeModel({
            model: "gemini-1.5-flash",
        });

        const prompt = `${getSystemPrompt()}\n${userMessages
            .map((msg) => msg.content)
            .join("\n")}`;

        const result = await model.generateContentStream(prompt);

        let finalResponse = "";

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            finalResponse += chunkText;

            process.stdout.write(chunkText);
        }

        res.status(200).json({
            response: finalResponse,
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            message: "An error occurred",
            error: error.message,
        });
    }
};

export { handleCheckAiTemplate, handleChatWithGemini };
