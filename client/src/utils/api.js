import client, { account, databases, avatars, appwriteConfig } from '../appwrite';
import { ID, Query } from 'appwrite';

const { databaseId, userCollectionId, messageCollectionId } = appwriteConfig;
const TOKEN_KEY = 'nexus_token';

function mapAppwriteError(err) {
  if (err?.message) return err.message;
  if (err instanceof TypeError && /fetch/i.test(err.message || '')) {
    return 'Network/CORS error. Add your Vercel domain as a Web Platform in Appwrite and verify VITE_APPWRITE_* env vars.';
  }
  return 'Request failed';
}

function requireConfig() {
  const missing = [];
  if (!appwriteConfig.projectId) missing.push('VITE_APPWRITE_PROJECT_ID');
  if (!databaseId) missing.push('VITE_APPWRITE_DATABASE_ID');
  if (!userCollectionId) missing.push('VITE_APPWRITE_USER_COLLECTION_ID');
  if (!messageCollectionId) missing.push('VITE_APPWRITE_MESSAGE_COLLECTION_ID');
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}

// We export resolveUrl to handle legacy paths
export function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return url;
}

// Fallback BACKEND_URL for components expecting it
export const BACKEND_URL = '';

class ApiClient {
  constructor() {
    this.user = null;
    this.sessionId = localStorage.getItem(TOKEN_KEY);
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    this.sessionId = token || null;
  }

  // --- Auth & Account ---
  async register(data) {
    requireConfig();
    try {
      const email = data.email;
      const password = data.password;
      const name = data.displayName || data.name || data.username || 'User';
      const username = (data.username || name)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 50);

      const userAccount = await account.create(ID.unique(), email, password, name);
      const session = await account.createEmailPasswordSession(email, password);
      this.setToken(session.$id);

      const avatarUrl = avatars.getInitials(name).toString();

      const userDoc = await databases.createDocument(databaseId, userCollectionId, userAccount.$id, {
        email,
        name,
        username: username || `user${Math.floor(Math.random() * 10000)}`,
        avatar: avatarUrl,
        status: 'Hey there! I am using Nexus Chat.'
      });

      return { user: userDoc, token: session.$id };
    } catch (err) {
      throw new Error(mapAppwriteError(err));
    }
  }

  async login(data) {
    requireConfig();
    try {
      const email = data.email || data.login;
      const password = data.password;
      const session = await account.createEmailPasswordSession(email, password);
      this.setToken(session.$id);

      const currAccount = await account.get();

      let userDoc;
      try {
        userDoc = await databases.getDocument(databaseId, userCollectionId, currAccount.$id);
      } catch (e) {
        const safeName = currAccount.name || 'User';
        userDoc = await databases.createDocument(databaseId, userCollectionId, currAccount.$id, {
          email: currAccount.email,
          name: safeName,
          username: safeName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 50) || `user${Math.floor(Math.random() * 10000)}`,
          avatar: avatars.getInitials(safeName).toString(),
          status: 'Hey there! I am using Nexus Chat.'
        });
      }

      return { user: userDoc, token: session.$id };
    } catch (err) {
      throw new Error(mapAppwriteError(err));
    }
  }

  async getMe() {
    try {
      const currAccount = await account.get();
      return await databases.getDocument(databaseId, userCollectionId, currAccount.$id);
    } catch (e) {
      throw new Error(mapAppwriteError(e));
    }
  }

  async logout() {
    try {
      await account.deleteSession('current');
    } catch(e) {}
    this.setToken(null);
  }

  async updateProfile(data) {
    const currAccount = await account.get();
    if (data.name) {
      await account.updateName(data.name);
    }
    return databases.updateDocument(databaseId, userCollectionId, currAccount.$id, {
      name: data.name,
      status: data.status,
      avatar: data.avatar
    });
  }

  async storePublicKey(publicKey) {
    return Promise.resolve();
  }

  // --- Users ---
  async searchUsers(q) {
    const response = await databases.listDocuments(databaseId, userCollectionId, [
        Query.search('username', q)
    ]);
    return response.documents;
  }

  async getUsers() {
    const response = await databases.listDocuments(databaseId, userCollectionId);
    return response.documents;
  }

  async getUser(id) {
    return databases.getDocument(databaseId, userCollectionId, id);
  }
  
  async getUserPublicKey() {
    return { publicKey: null };
  }

  // --- Conversations & Messages ---
  async getConversations() {
    return [];
  }

  async createPrivateConversation(userId) {
    return { id: userId, isGroup: false };
  }

  async getMessages(conversationId) {
    const user = await account.get();
    const response = await databases.listDocuments(databaseId, messageCollectionId, [
      Query.limit(100),
      Query.orderDesc('timestamp')
    ]);
    
    // Manual filter since OR queries can be complex if not indexed
    const msgs = response.documents.filter(m => 
      (m.senderId === user.$id && m.receiverId === conversationId) ||
      (m.senderId === conversationId && m.receiverId === user.$id)
    );
    
    return msgs.reverse();
  }

  async sendMessage(conversationId, data) {
    const userAccount = await account.get();
    return databases.createDocument(databaseId, messageCollectionId, ID.unique(), {
        senderId: userAccount.$id,
        receiverId: conversationId,
        content: data.content || data.fileUrl || '',
        timestamp: new Date().toISOString()
    });
  }

  async editMessage(messageId, content) {
    return databases.updateDocument(databaseId, messageCollectionId, messageId, { 
      content,
    });
  }

  async deleteMessage(messageId) {
    return databases.deleteDocument(databaseId, messageCollectionId, messageId);
  }

  // Stubs
  async reactToMessage() { return {}; }
  async pinMessage() { return {}; }
  async starMessage() { return {}; }
  async markAsRead() { return {}; }
  async searchMessages() { return []; }
  async bookmarkMessage() { return {}; }
  async getBookmarks() { return []; }
  async forwardMessage() { return {}; }
  async getPinnedMessages() { return []; }
}

const api = new ApiClient();
export default api;