// utils/langbase.ts
import { Langbase, getRunner } from 'langbase';

const getLangbase = () => {
    const apiKey = process.env.NEXT_PUBLIC_LANGBASE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing Langbase API Key. Check your .env.local file.");
    }
    return new Langbase({ apiKey });
};

const langbase = getLangbase();
const MAX_PROCESSING_TIME = 45000; // 45 seconds (to allow buffer for Vercel's 60s limit)

// Upload text to Langbase memory with timeout handling
export const uploadToMemory = async (content: string, filename: string) => {
    try {
        const buffer = Buffer.from(content, "utf-8");

        // Add timeout handling for the upload operation
        const uploadPromise = langbase.memory.documents.upload({
            document: buffer,
            memoryName: "brooklinen",
            contentType: "text/plain",
            documentName: filename,
        });

        const response = await Promise.race([
            uploadPromise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Upload operation timed out")), MAX_PROCESSING_TIME)
            )
        ]);

        console.log("Upload successful:", filename);
        return response;
    } catch (error) {
        console.error("Error uploading to memory:", error);
        // Fix type error by properly handling unknown error
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Upload failed: ${errorMessage}`);
    }
};

// Send a message to Langbase chat with better timeout handling
interface Message {
    role: "user" | "assistant";
    content: string;
}

const plainMessage: Message[] = [];
let threadId: string | undefined;

export const chatWithLangbase = async (message: string) => {
    try {
        console.log("Sending message to Langbase:", message);

        plainMessage.push({ role: "user", content: message });

        const response = await langbase.pipe.run({
            name: "brooklinen",
            stream: true,
            messages: plainMessage,
            ...(threadId && { threadId }) 
        });

        if (!threadId && response.threadId) {
            threadId = response.threadId; 
        }

        const { stream } = response;
        const runner = getRunner(stream);

        let result = "";
        await new Promise<void>((resolve) => {
            runner.on("content", (content) => {
                result += content;
            });
            runner.on("end", () => {
                resolve();
            });
        });

        return result;
    } catch (error) {
        console.error("Langbase Chat Error:", error);
        throw new Error("Failed to chat with Langbase.");
    }
};
