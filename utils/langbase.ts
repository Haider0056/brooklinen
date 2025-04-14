import { Langbase, getRunner } from 'langbase';

const getLangbase = () => {
    const apiKey = process.env.NEXT_PUBLIC_LANGBASE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing Langbase API Key. Check your .env.local file.");
    }
    return new Langbase({ apiKey });
};

const langbase = getLangbase();


// Upload text to Langbase memory
export const uploadToMemory = async (content: string,filename:string) => {
    try {
        const buffer = Buffer.from(content, "utf-8");

        const response = await langbase.memory.documents.upload({
            document: buffer,
            memoryName: "living-abroad",
            contentType: "text/plain",
            documentName: filename,
        });
        console.log("Response",response)
        return response;
    } catch (error) {
        console.error("Error uploading to memory:", error);
        throw new Error("Failed to upload document.");
    }
};

// Send a message to Langbase chat
interface Message {
    role: "user" | "assistant";
    content: string;
}
// const messageHistory: Message[] = [];
const plainMessage: Message[] = [];
let threadId: string | undefined;
export const chatWithLangbase = async (message: string) => {
    try {
        console.log("Sending message to Langbase:", message);

        plainMessage.push({ role: "user", content: message });

        const response = await langbase.pipe.run({
            name: "living-abroad",
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
        throw new Error("Failed to chat with Langbase."); //langbase error
    }
};
