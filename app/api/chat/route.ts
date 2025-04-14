// app/api/chat/route.ts
import { chatWithLangbase } from '../../../utils/langbase';
import { NextRequest, NextResponse } from 'next/server';

// Set to edge runtime for potentially better timeout handling
export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        // Parse the incoming request
        const data = await request.json();
        const { message } = data;
        
        if (!message) {
            return NextResponse.json(
                { error: "Message is required" },
                { status: 400 }
            );
        }

        // Set a timeout for the entire request handler
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error("Request processing timed out"));
            }, 55000); // 55 seconds (just under Vercel's 60s limit)
        });

        // Process the chat request with timeout
        const responsePromise = chatWithLangbase(message);
        
        // Race between completion and timeout
        const response = await Promise.race([responsePromise, timeoutPromise])
            .catch(error => {
                // If we get a timeout or other error
                console.error("API request failed:", error);
                throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            });
        
        return NextResponse.json({ response });
    } catch (error) {
        console.error("API error:", error);
        
        // Properly handle the unknown error type
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        
        // Check if the error has a partialResponse property (using type guard)
        const partialResponse = error && 
            typeof error === 'object' && 
            'partialResponse' in error ? 
            (error as { partialResponse: unknown }).partialResponse : 
            null;
        
        // Return a graceful error response
        return NextResponse.json(
            { 
                error: errorMessage,
                partial: partialResponse
            },
            { status: 500 }
        );
    }
}