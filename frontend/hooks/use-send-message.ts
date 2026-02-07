// import { getQueryClient } from "@/lib/get-query-client";
// import { Message } from "@/lib/types";
// import { useMutation } from "@tanstack/react-query";

// export function useSendMessage(conversationId: string, socketId: string | undefined, userId: string | undefined) {
//     const queryClient = getQueryClient();

//     return useMutation({
//         mutationFn: (message: string) =>
//             sendMessage(message, conversationId, socketId!, userId!),

//         onMutate: async (text: string) => {
//             await queryClient.cancelQueries({
//                 queryKey: ['chat-messages', conversationId],
//             });

//             const previousMessages = queryClient.getQueryData<Message[]>([
//                 'chat-messages',
//                 conversationId,
//             ]);

//             // TEMP ids (client-only)
//             const tempUserMessageId = new Date().getTime().toString();
//             const tempAiMessageId = (new Date().getTime() + 1).toString();

//             queryClient.setQueryData(['chat-messages', conversationId], (prevItem: Message[] | undefined) =>
//                 prevItem
//                     ? [
//                         ...prevItem,
//                         {
//                             id: tempUserMessageId,
//                             conversationId: conversationId,
//                             role: 'user',
//                             content: text,
//                             status: 'sending',
//                             createdAt: new Date().toISOString(),
//                         },
//                         {
//                             id: tempAiMessageId,
//                             conversationId: conversationId,
//                             role: 'assistant',
//                             content: '',
//                             status: 'streaming',
//                             createdAt: new Date().toISOString(),
//                         },
//                     ]
//                     : [
//                         {
//                             id: tempUserMessageId,
//                             conversationId: conversationId,
//                             role: 'user',
//                             content: text,
//                             status: 'sending',
//                             createdAt: new Date().toISOString(),
//                         },
//                         {
//                             id: tempAiMessageId,
//                             conversationId: conversationId,
//                             role: 'assistant',
//                             content: '',
//                             status: 'streaming',
//                             createdAt: new Date().toISOString(),
//                         },
//                     ]
//             )

//             return {
//                 previousMessages,
//                 tempUserMessageId,
//                 tempAiMessageId,
//             };
//         },
//         onError: (_err, _text, context) => {
//             queryClient.setQueryData(
//                 ['chat-messages', conversationId],
//                 context?.previousMessages
//             );
//         },
//     });
// }
