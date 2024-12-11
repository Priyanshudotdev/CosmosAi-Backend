import { config } from "dotenv";
config({
    path: "./././.env",
});
import { OpenAI } from "openai";
import { BASE_PROMPT, getSystemPrompt } from "../helper/prompt.js";
import { nodeBasePrompt, reactBasePrompt } from "../helper/defaultPrompts.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
});

const geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

const handleCheckAiTemplate = async (req, res) => {
    const prompt = req.body.prompt;
    if (!prompt)
        return res.json({
            message: "Prompt is required",
            status: 401,
        });
    try {
        const completion = await openai.chat.completions.create({
            model: "nvidia/llama-3.1-nemotron-70b-instruct",
            messages: [
                {
                    role: "user",
                    content: ` ${prompt} 
                        from above prompt Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra`,
                },
            ],
            temperature: 0.5,
            top_p: 1,
            max_tokens: 200,
            // system: "",
        });

        const answer = completion.choices?.[0]?.message?.content.trim();

        if (answer === "react" || answer === "React") {
            return res.json({
                prompts: [
                    BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [reactBasePrompt],
            });
        }

        if (answer === "node" || answer === "Node") {
            return res.json({
                prompts: [
                    BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [nodeBasePrompt],
            });
        }

        res.status(403).json({ message: "You can't access this." });
    } catch (error) {
        console.error("Error handling AI template:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const handleChatWithAi = async (req, res) => {
    try {
        const Usermessages = req.body.messages;
        if (!Usermessages)
            return res.json({ message: "Message requried", status: 401 });

        const response = await client.chat.completions.create({
            model: "meta-llama/Llama-3.2-11B-Vision-Instruct",
            messages: [
                ...Usermessages,
                {
                    role: "system",
                    content: getSystemPrompt(),
                },
            ],
            max_tokens: 200,
            stream: true,
        });

        // res.writeHead(200, {
        //     "Content-Type": "text/event-stream",
        //     "Cache-Control": "no-cache",
        //     Connection: "keep-alive",
        // });

        // if (!response) return res.json({ message: "Unable to fetch the data" });

        let finalResponse = "";

        for await (const chunk of response) {
            if (chunk.choices && chunk.choices.length > 0) {
                const newContent = chunk.choices[0].delta?.content || "";
                finalResponse += newContent;

                // Log without new line
                process.stdout.write(newContent);

                // Send chunk to the client
                res.write(newContent);
            }
        }

        res.json({
            response: finalResponse,
        });
    } catch (error) {
        console.log("Error", error);
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

        // Create a chat model instance
        const model = geminiClient.getGenerativeModel({
            model: "gemini-1.5-flash",
        });

        // Combine user messages into a single prompt
        const prompt = `${getSystemPrompt()}\n${userMessages
            .map((msg) => msg.content)
            .join("\n")}`;

        // Generate content stream from the model
        const result = await model.generateContentStream(prompt);

        let finalResponse = "";

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            finalResponse += chunkText;

            // Log without new line
            process.stdout.write(chunkText);

            // Send chunk to the client
            // res.write(chunkText);
        }

        // Signal the end of the response
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

export { handleCheckAiTemplate, handleChatWithAi, handleChatWithGemini };
