import { Client, Account, Databases, Storage, Avatars } from 'appwrite';

const DEFAULT_APPWRITE = {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectId: '69ea8ab4002d951ad4fe',
    databaseId: '69ea8bed002722169e62',
    userCollectionId: '69ea8c7f0023492752fa',
    messageCollectionId: '69ea8cbf001a5ab705f0',
    storageId: '69ea8d0a0001199a7474',
};

export const appwriteConfig = {
    url: import.meta.env.VITE_APPWRITE_ENDPOINT || DEFAULT_APPWRITE.endpoint,
    projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID || DEFAULT_APPWRITE.projectId,
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || DEFAULT_APPWRITE.databaseId,
    userCollectionId: import.meta.env.VITE_APPWRITE_USER_COLLECTION_ID || DEFAULT_APPWRITE.userCollectionId,
    messageCollectionId: import.meta.env.VITE_APPWRITE_MESSAGE_COLLECTION_ID || DEFAULT_APPWRITE.messageCollectionId,
    storageId: import.meta.env.VITE_APPWRITE_STORAGE_ID || DEFAULT_APPWRITE.storageId,
};

const client = new Client();

client
    .setEndpoint(appwriteConfig.url)
    .setProject(appwriteConfig.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);

export default client;