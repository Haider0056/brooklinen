import { NextResponse } from "next/server";
import { chatWithLangbase } from "@/utils/langbase";

export async function POST(req: Request) {
    try {
        const { message } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const response = await chatWithLangbase(message);
        return NextResponse.json({ reply: response });
    } catch (error: unknown) {
        console.error("Chat API Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Chat failed";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
