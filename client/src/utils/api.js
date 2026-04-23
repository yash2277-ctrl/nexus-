import client, { account, databases, avatars, appwriteConfig } from '../appwrite';
import { ID, Query } from 'appwrite';

const { databaseId, userCollectionId, messageCollectionId } = appwriteConfig;

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
    this.sessionId = localStorage.getItem('nexus_session');
  }

  // --- Auth & Account ---
  async register(data) {
    const { email, password, name } = data;
    const userAccount = await account.create(ID.unique(), email, password, name);
    const session = await account.createEmailPasswordSession(email, password);
    localStorage.setItem('nexus_session', session.$id);
    
    let avatarUrl = avatars.getInitials(name).toString();
    
    const userDoc = await databases.createDocument(databaseId, userCollectionId, userAccount.$id, {
      email,
      name,
      username: name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random()*100),
      avatar: avatarUrl
    });

    return { user: userDoc, token: session.$id };
  }

  async login(data) {
    const { email, password } = data;
    const session = await account.createEmailPasswordSession(email, password);
    localStorage.setItem('nexus_session', session.$id);
    
    const currAccount = await account.get();
    
    let userDoc;
    try {
      userDoc = await databases.getDocument(databaseId, userCollectionId, currAccount.$id);
    } catch (e) {
      userDoc = await databases.createDocument(databaseId, userCollectionId, currAccount.$id, {
        email: currAccount.email,
        name: currAccount.name,
        username: currAccount.name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random()*100),
        avatar: avatars.getInitials(currAccount.name).toString()
      });
    }

    return { user: userDoc, token: session.$id };
  }

  async getMe() {
    try {
      const currAccount = await account.get();
      return await databases.getDocument(databaseId, userCollectionId, currAccount.$id);
    } catch (e) {
      throw new Error('Not logged in');
    }
  }

  async logout() {
    try {
      await account.deleteSession('current');
    } catch(e) {}
    localStorage.removeItem('nexus_session');
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