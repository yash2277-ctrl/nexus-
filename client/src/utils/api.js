// Backend URL for split deployment (Vercel frontend + Render backend)
// Set VITE_API_URL to your Render backend URL, e.g. https://nexus-chat.onrender.com
// Leave empty for same-origin / monolith deployment
export const BACKEND_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${BACKEND_URL}/api`;

// Resolve relative URLs (e.g. /uploads/...) to absolute backend URLs
export function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${BACKEND_URL}${url}`;
}

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('nexus_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('nexus_token', token);
    } else {
      localStorage.removeItem('nexus_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('nexus_token');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      this.setToken(null);
      window.location.reload();
      throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth
  async register(data) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setToken(res.token);
    return res;
  }

  async login(data) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setToken(res.token);
    return res;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(data) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async storePublicKey(publicKey) {
    return this.request('/auth/public-key', {
      method: 'POST',
      body: JSON.stringify({ publicKey })
    });
  }

  // Users
  async searchUsers(q) {
    return this.request(`/users/search?q=${encodeURIComponent(q)}`);
  }

  async getUsers() {
    return this.request('/users');
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async getUserPublicKey(id) {
    return this.request(`/users/${id}/public-key`);
  }

  // Conversations
  async getConversations() {
    return this.request('/messages/conversations');
  }

  async createPrivateConversation(userId) {
    return this.request('/messages/conversations/private', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  // Messages
  async getMessages(conversationId, before = null) {
    let url = `/messages/conversations/${conversationId}/messages`;
    if (before) url += `?before=${before}`;
    return this.request(url);
  }

  async sendMessage(conversationId, data) {
    return this.request(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async editMessage(messageId, content) {
    return this.request(`/messages/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
  }

  async deleteMessage(messageId) {
    return this.request(`/messages/messages/${messageId}`, {
      method: 'DELETE'
    });
  }

  async reactToMessage(messageId, emoji) {
    return this.request(`/messages/messages/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji })
    });
  }

  async pinMessage(messageId) {
    return this.request(`/messages/messages/${messageId}/pin`, {
      method: 'POST'
    });
  }

  async starMessage(messageId) {
    return this.request(`/messages/messages/${messageId}/star`, {
      method: 'POST'
    });
  }

  async bookmarkMessage(messageId, tags = [], note = '') {
    return this.request(`/messages/messages/${messageId}/bookmark`, {
      method: 'POST',
      body: JSON.stringify({ tags, note })
    });
  }

  async getBookmarks() {
    return this.request('/messages/bookmarks');
  }

  async forwardMessage(messageId, conversationIds) {
    return this.request(`/messages/messages/${messageId}/forward`, {
      method: 'POST',
      body: JSON.stringify({ conversationIds })
    });
  }

  async markAsRead(conversationId, messageId) {
    return this.request(`/messages/conversations/${conversationId}/read`, {
      method: 'POST',
      body: JSON.stringify({ messageId })
    });
  }

  async searchMessages(q, conversationId = null) {
    let url = `/messages/search?q=${encodeURIComponent(q)}`;
    if (conversationId) url += `&conversationId=${conversationId}`;
    return this.request(url);
  }

  async getPinnedMessages(conversationId) {
    return this.request(`/messages/conversations/${conversationId}/pinned`);
  }

  // Scheduled messages
  async scheduleMessage(data) {
    return this.request('/messages/scheduled', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getScheduledMessages() {
    return this.request('/messages/scheduled');
  }

  // Groups
  async createGroup(data) {
    return this.request('/groups', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateGroup(groupId, data) {
    return this.request(`/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async addGroupMembers(groupId, userIds) {
    return this.request(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userIds })
    });
  }

  async removeGroupMember(groupId, userId) {
    return this.request(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE'
    });
  }

  async leaveGroup(groupId) {
    return this.request(`/groups/${groupId}/leave`, {
      method: 'POST'
    });
  }

  async createPoll(groupId, data) {
    return this.request(`/groups/${groupId}/poll`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async votePoll(pollId, optionId) {
    return this.request(`/groups/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId })
    });
  }

  // Notes
  async getNotes(conversationId) {
    return this.request(`/groups/${conversationId}/notes`);
  }

  async createNote(conversationId, data) {
    return this.request(`/groups/${conversationId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateNote(noteId, data) {
    return this.request(`/groups/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Stories
  async getStories() {
    return this.request('/stories');
  }

  async createStory(data) {
    return this.request('/stories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async viewStory(storyId) {
    return this.request(`/stories/${storyId}/view`, {
      method: 'POST'
    });
  }

  async reactToStory(storyId, emoji) {
    return this.request(`/stories/${storyId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji })
    });
  }

  async deleteStory(storyId) {
    return this.request(`/stories/${storyId}`, {
      method: 'DELETE'
    });
  }

  // Media upload
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const response = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    return response.json();
  }

  async uploadBase64(data, type, extension) {
    return this.request('/media/upload-base64', {
      method: 'POST',
      body: JSON.stringify({ data, type, extension })
    });
  }

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = this.getToken();
    const response = await fetch(`${API_BASE}/media/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    return response.json();
  }
}

export const api = new ApiClient();
export default api;
