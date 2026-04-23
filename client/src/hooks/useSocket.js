import { useEffect, useRef, useCallback } from 'react';
import client, { appwriteConfig, account } from '../appwrite';
import useStore from '../store/useStore';
import { playNotificationSound } from '../utils/helpers';

const { databaseId, messageCollectionId } = appwriteConfig;

// Since we removed socket.io, we will mock the socket object for backward compatibility
// in the components that might still call socket.emit()
const mockSocket = {
  emit: (event, data) => {
    // Appwrite doesn't have ephemeral socket events.
    // Real-time actions must be done via database updates or Appwrite Functions
    console.debug(`[Mock Socket] emit ${event}`, data);
  },
  disconnect: () => {},
  connected: true
};

export function getSocket() {
  return mockSocket;
}

export function useSocket() {
  const unsubscribeRef = useRef(null);
  const { 
    user, isAuthenticated,
    addMessage, updateMessage, removeMessage
  } = useStore();

  const connect = useCallback(() => {
    if (!isAuthenticated) return;
    
    // Prevent multiple subscriptions
    if (unsubscribeRef.current) return;

    console.log('🔌 Connecting to Appwrite Realtime...');
    
    // Subscribe to messages collection
    const channel = `databases.${databaseId}.collections.${messageCollectionId}.documents`;
    
    const unsubscribe = client.subscribe(channel, response => {
      const { events, payload } = response;
      console.log('Appwrite Realtime Event:', events, payload);

      // Check if it belongs to our user
      const isParticipant = payload.senderId === user?.$id || payload.receiverId === user?.$id;
      if (!isParticipant) return;

      // Handle Appwrite Events
      if (events.includes('databases.*.collections.*.documents.*.create')) {
        // Map payload to our app's message format
        const message = {
          id: payload.$id,
          conversation_id: user?.$id === payload.senderId ? payload.receiverId : payload.senderId,
          sender_id: payload.senderId,
          content: payload.content,
          created_at: payload.timestamp,
          // Stubs
          is_pinned: 0,
          reactions: []
        };
        
        addMessage(message);
        if (message.sender_id !== user?.$id) {
          playNotificationSound();
        }
      }

      if (events.includes('databases.*.collections.*.documents.*.update')) {
        updateMessage({
          id: payload.$id,
          content: payload.content,
          updated_at: payload.timestamp
        });
      }

      if (events.includes('databases.*.collections.*.documents.*.delete')) {
        removeMessage(payload.$id);
      }
    });

    unsubscribeRef.current = unsubscribe;

    return mockSocket;
  }, [isAuthenticated, user?.$id]);

  useEffect(() => {
    connect();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [connect]);

  // Join/leave conversation rooms (stubbed)
  useEffect(() => {
    // Rooms are handled intrinsically by the Appwrite Subscription filtering logic above
  }, []);

  return mockSocket;
}

export default useSocket;