"use client";

import { useState, useEffect, useRef } from "react";
import { ChatBotWidget } from "chatbot-widget-ui";

export default function ChatWindow() {
  const [chatHistory, setChatHistory] = useState<
    { sender: string; text: string; isLoading?: boolean }[]
  >([]);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, streamingMessage]);

  // Function to clean response text by removing unwanted characters
  const cleanResponseText = (text: string): string => {
    // Replace escaped newlines with actual newlines
    let cleaned = text.replace(/\\n/g, "\n");
    
    // Remove any remaining escape sequences
    cleaned = cleaned.replace(/\\(.)/g, "$1");
    
    // Handle any JSON-related formatting issues
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    
    return cleaned;
  };

  const callApiHandler = async (message: string): Promise<string> => {
    try {
      setIsTyping(true);
      setStreamingMessage("");
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      // Stream reading function
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode the current chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Process the chunk to extract the response text
        let chunkText = chunk;
        if (chunk.startsWith('{"reply":')) {
          chunkText = chunk.substring('{"reply":'.length);
          if (chunkText.endsWith("}")) {
            chunkText = chunkText.substring(0, chunkText.length - 1);
          }
          if (chunkText.startsWith('"') && chunkText.endsWith('"')) {
            chunkText = chunkText.substring(1, chunkText.length - 1);
          }
        }
        
        // Clean the text
        chunkText = cleanResponseText(chunkText);
        
        // Add to the full response
        fullResponse += chunkText;
        
        // Update streaming message for real-time display
        setStreamingMessage(fullResponse);
      }

      // Final cleanup
      fullResponse = cleanResponseText(fullResponse);
      setIsTyping(false);
      
      return fullResponse;
    } catch (error) {
      console.error("Chat failed:", error);
      setIsTyping(false);
      return "Sorry, there was an error processing your request.";
    }
  };

  // Transform chat history to the expected format for the ChatBotWidget
  const formattedMessages = [
    ...chatHistory.map((chat) => ({
      content: chat.text,
      role: chat.sender === "user" ? "user" : "assistant",
    })),
    // Add streaming message if it exists
    ...(streamingMessage 
      ? [{ content: streamingMessage, role: "assistant", isTyping: true }] 
      : [])
  ];

  return (
    <div className="flex flex-wrap w-full h-full">
      <ChatBotWidget
        callApi={callApiHandler}
        onBotResponse={(response: string) => {
          // Only add the response to history if it's not already being streamed
          if (!isTyping) {
            setChatHistory((prev) => [
              ...prev,
              { sender: "bot", text: cleanResponseText(response) },
            ]);
          }
          setStreamingMessage("");
        }}
        handleNewMessage={(newMessage: string | any) => {
          const messageText = typeof newMessage === "string"
            ? newMessage
            : newMessage.content || JSON.stringify(newMessage);
            
          setChatHistory((prev) => [
            ...prev,
            { sender: "user", text: messageText },
          ]);
        }}
        messages={formattedMessages}
        primaryColor="#3498db"
        inputMsgPlaceholder="Type your message..."
        chatbotName="Customer Support"
        isTypingMessage={isTyping ? "Typing..." : ""}
        IncommingErrMsg="Oops! Something went wrong. Try again."
        chatIcon={<div>O</div>}
        botIcon={<div>B</div>}
        botFontStyle={{
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#006633",
        }}
        typingFontStyle={{
          fontFamily: "Arial",
          fontSize: "12px",
          color: "#888",
          fontStyle: "italic",
        }}
        useInnerHTML={true}
      />
    </div>
  );
}