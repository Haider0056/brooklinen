import { NextResponse } from "next/server";
import { uploadToMemory } from "@/utils/langbase";

export async function POST(req: Request) {
    try {
        const { text,filename} = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const response = await uploadToMemory(text,filename);
        return NextResponse.json({ message: "Uploaded successfully", data: response });
    } catch (error) {
        console.error("Upload API Error:", error);
        return NextResponse.json({ error: "Failed to upload" }, { status: 500 });
    }
}
