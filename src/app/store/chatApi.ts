import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface Message {
  _id: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
}

interface Chat {
  _id: string;
  title: string;
  messages: Message[];
}

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/' }),
  tagTypes: ['Chat'],
  endpoints: (builder) => ({
    getChats: builder.query<Chat[], void>({
      query: () => 'chats',
      providesTags: (result) =>
        result
          ? [...result.map(({ _id }) => ({ type: 'Chat' as const, id: _id })), 'Chat']
          : ['Chat'],
    }),
    getChat: builder.query<Chat, string>({
      query: (id) => `chats/${id}`,
      providesTags: (result, error, id) => [{ type: 'Chat', id }],
    }),
    createChat: builder.mutation<Chat, { title: string }>({
      query: (body) => ({
        url: 'chats',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Chat'],
    }),
    updateChat: builder.mutation<Chat, { id: string; title: string }>({
      query: ({ id, ...body }) => ({
        url: `chats/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Chat', id }],
    }),
    deleteChat: builder.mutation<void, string>({
      query: (id) => ({
        url: `chats/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Chat', id }],
    }),
    createMessage: builder.mutation<Message, { chatId: string; role: 'user' | 'model'; content: string }>({
      query: ({ chatId, ...body }) => ({
        url: 'messages',
        method: 'POST',
        body: { ...body, chatId },
      }),
      invalidatesTags: (result, error, { chatId }) => [{ type: 'Chat', id: chatId }],
    }),
  }),
});

export const {
  useGetChatsQuery,
  useLazyGetChatsQuery,
  useGetChatQuery,
  useCreateChatMutation,
  useUpdateChatMutation,
  useDeleteChatMutation,
  useCreateMessageMutation,
} = chatApi;