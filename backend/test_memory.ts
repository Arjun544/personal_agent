import { agent } from "./src/services/agent";

async function testMemory() {
    const threadId = "test-thread-" + Math.random().toString(36).substring(7);
    const userId = "test-user";

    console.log("--- First Message ---");
    const stream1 = agent.streamEvents(
        { messages: [{ role: "user", content: "Hi, my name is Arjun." }] },
        {
            version: "v2",
            configurable: {
                thread_id: threadId,
                user_id: userId,
            }
        }
    );

    for await (const event of stream1) {
        if (event.event === "on_chat_model_stream") {
            process.stdout.write(event.data.chunk.content || "");
        }
    }
    console.log("\n--- Second Message ---");
    const stream2 = agent.streamEvents(
        { messages: [{ role: "user", content: "What is my name?" }] },
        {
            version: "v2",
            configurable: {
                thread_id: threadId,
                user_id: userId,
            }
        }
    );

    for await (const event of stream2) {
        if (event.event === "on_chat_model_stream") {
            process.stdout.write(event.data.chunk.content || "");
        }
    }
    console.log("\n--- End ---");
}

testMemory().catch(console.error);
