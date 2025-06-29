export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chat {
  _id: string;
  title: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Message {
  id?: string;
  chatId: string;
  content: string;
  role: 'user' | 'model';
  createdAt?: Date;
}