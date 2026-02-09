import { agent } from "./src/services/agent";
import { checkpointer, store } from "./src/services/checkpointer";

async function testLongTermMemory() {
    // Setup (idempotent)
    await checkpointer.setup();
    await store.setup();

    const thread1 = "thread-" + Math.random().toString(36).substring(7);
    const thread2 = "thread-" + Math.random().toString(36).substring(7);
    const userId = "test-user-123";

    console.log("--- Conversation 1 (Thread 1) ---");
    console.log("User: My name is Arjun. Remember that.");

    const stream1 = agent.streamEvents(
        { messages: [{ role: "user", content: "My name is Arjun. Remember that." }] },
        { version: "v2", configurable: { thread_id: thread1, user_id: userId } }
    );

    for await (const event of stream1) {
        if (event.event === "on_chat_model_stream") {
            process.stdout.write(event.data.chunk.content || "");
        }
    }

    console.log("\n\n--- Conversation 2 (Thread 2 - NEW) ---");
    console.log("User: What is my name?");

    const stream2 = agent.streamEvents(
        { messages: [{ role: "user", content: "What is my name?" }] },
        { version: "v2", configurable: { thread_id: thread2, user_id: userId } }
    );

    for await (const event of stream2) {
        if (event.event === "on_chat_model_stream") {
            process.stdout.write(event.data.chunk.content || "");
        }
    }
    console.log("\n--- End ---");
}

testLongTermMemory().catch(console.error);
