import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import useStore from '../store/useStore';
import { playNotificationSound } from '../utils/helpers';
import { BACKEND_URL } from '../utils/api';
import { getPeerConnection, cleanupCall, addPendingCandidate, markRemoteDescSet, flushPendingCandidates } from '../utils/callManager';

let socket = null;

export function getSocket() {
  return socket;
}

export function useSocket() {
  const socketRef = useRef(null);
  const { 
    user, token, isAuthenticated,
    addMessage, updateMessage, removeMessage, updateReactions,
    setTyping, setUserOnline, addConversation, updateConversation,
    activeConversation, loadConversations
  } = useStore();

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) return;
    if (socket?.connected) return;

    // Connect to backend URL (Render in production, same-origin in dev)
    const socketUrl = BACKEND_URL || window.location.origin;

    socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      // For production behind reverse proxy with HTTPS
      secure: window.location.protocol === 'https:',
      rejectUnauthorized: false
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected, transport:', socket.io.engine.transport.name);
    });

    socket.on('connect_error', (err) => {
      console.error('🔌 Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('reconnect', (attempt) => {
      console.log('🔌 Socket reconnected after', attempt, 'attempts');
    });

    // Message events
    socket.on('new_message', (message) => {
      addMessage(message);
      if (message.sender_id !== user?.id) {
        playNotificationSound();
      }
    });

    socket.on('message_edited', (message) => {
      updateMessage(message);
    });

    socket.on('message_deleted', ({ messageId }) => {
      removeMessage(messageId);
    });

    socket.on('message_reaction', ({ messageId, reactions }) => {
      updateReactions(messageId, reactions);
    });

    socket.on('message_pinned', ({ messageId, isPinned }) => {
      updateMessage({ id: messageId, is_pinned: isPinned ? 1 : 0 });
    });

    socket.on('messages_read', ({ conversationId, userId }) => {
      // Update read status in UI
    });

    // Typing indicators
    socket.on('typing_indicator', ({ conversationId, userId, isTyping }) => {
      if (userId !== user?.id) {
        setTyping(conversationId, userId, isTyping);
      }
    });

    // User online status
    socket.on('user_online', ({ userId, isOnline, lastSeen }) => {
      setUserOnline(userId, isOnline, lastSeen);
    });

    // Conversation events
    socket.on('new_conversation', (conv) => {
      addConversation(conv);
    });

    socket.on('conversation_updated', ({ conversationId, lastMessage }) => {
      updateConversation(conversationId, { lastMessage, updated_at: lastMessage.created_at });
    });

    socket.on('group_updated', (conv) => {
      updateConversation(conv.id, conv);
    });

    socket.on('members_updated', ({ conversationId, participants }) => {
      updateConversation(conversationId, { participants });
    });

    socket.on('member_left', ({ conversationId }) => {
      loadConversations();
    });

    socket.on('removed_from_group', ({ conversationId }) => {
      loadConversations();
    });

    // Poll updates
    socket.on('poll_updated', ({ pollId, messageId, options }) => {
      const { messages } = useStore.getState();
      const msg = messages.find(m => m.id === messageId);
      if (msg) {
        updateMessage({ id: messageId, poll: { ...msg.poll, options } });
      }
    });

    // Call events
    socket.on('incoming_call', (data) => {
      useStore.getState().setActiveCall({
        type: 'incoming',
        callType: data.callType,
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        conversationId: data.conversationId,
        offer: data.offer
      });
    });

    socket.on('call_answered', ({ answer }) => {
      console.log('📞 call_answered received');
      const pc = getPeerConnection();
      if (pc && pc.signalingState !== 'closed') {
        pc.setRemoteDescription(new RTCSessionDescription(answer))
          .then(() => {
            console.log('📞 Remote description set (answer), flushing candidates');
            markRemoteDescSet();
            return flushPendingCandidates();
          })
          .catch(err => console.error('Failed to set remote description:', err));
      }
    });

    socket.on('call_rejected', () => {
      cleanupCall();
      useStore.getState().setActiveCall(null);
    });

    socket.on('call_ended', () => {
      cleanupCall();
      useStore.getState().setActiveCall(null);
    });

    socket.on('ice_candidate', ({ candidate }) => {
      const pc = getPeerConnection();
      if (pc && pc.signalingState !== 'closed' && pc.remoteDescription) {
        // PC exists and remote description is set - add directly
        pc.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(err => console.warn('Failed to add ICE candidate:', err));
      } else {
        // Buffer the candidate - will be flushed after remote description is set
        console.log('📞 Buffering ICE candidate (PC or remote desc not ready)');
        addPendingCandidate(candidate);
      }
    });

    // Note collaboration
    socket.on('note_content_update', ({ noteId, content, editedBy }) => {
      // Handle real-time note updates
    });

    // Story events
    socket.on('new_story', () => {
      useStore.getState().loadStories();
    });

    socket.on('story_reaction', ({ storyId, emoji, from }) => {
      playNotificationSound();
    });

    return socket;
  }, [isAuthenticated, token, user?.id]);

  useEffect(() => {
    connect();
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [connect]);

  // Join/leave conversation rooms
  useEffect(() => {
    if (socket && activeConversation) {
      socket.emit('join_conversation', { conversationId: activeConversation.id });
    }
  }, [activeConversation?.id]);

  return socketRef.current;
}

export default useSocket;
