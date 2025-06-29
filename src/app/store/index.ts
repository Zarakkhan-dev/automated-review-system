'use client';
import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import { chatApi } from './chatApi';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(api.middleware)
      .concat(chatApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;