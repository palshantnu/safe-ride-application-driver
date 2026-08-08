import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import CurvedHeader from '../../components/CurvedHeader';
import { getSupportConversation, sendSupportMessage } from '../../services/Services';
import { baseURL } from '../../axios/axiosinstance';

const SOCKET_URL = baseURL.replace(/\/api\/?$/, '');

const ChatSupportScreen = ({ navigation }) => {
  const { loginToken } = useSelector((state) => state.auth);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const socketRef = useRef(null);
  const conversationIdRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const loadConversation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSupportConversation();
      const conv = res?.data?.conversation;
      const msgs = res?.data?.messages || [];
      setConversationId(conv?.id ?? null);
      setMessages(msgs);
      scrollToBottom();
    } catch (e) {
      console.log('getSupportConversation error:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // live updates while the screen is open
  useEffect(() => {
    if (!loginToken) return;
    const socket = io(SOCKET_URL, {
      auth: { token: `Bearer ${loginToken}`, client_type: 'DRIVER' },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // Rooms don't survive a reconnect (network blip, app backgrounded then
    // resumed, etc.) — 'connect' fires on the very first connection AND every
    // reconnection, so re-joining here (instead of only when conversationId
    // first changes) is what keeps live messages flowing without a manual reload.
    socket.on('connect', () => {
      if (conversationIdRef.current) {
        socket.emit('join_conversation', conversationIdRef.current);
      }
    });

    socket.on('new_message', (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      scrollToBottom();
    });

    return () => socket.disconnect();
  }, [loginToken]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
    if (conversationId && socketRef.current?.connected) {
      socketRef.current.emit('join_conversation', conversationId);
    }
  }, [conversationId]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setInputText('');
    setSending(true);
    try {
      const res = await sendSupportMessage(text);
      const saved = res?.data;
      if (saved) {
        setConversationId(saved.conversation_id);
        setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
        scrollToBottom();
      }
    } catch (e) {
      console.log('sendSupportMessage error:', e?.response?.data || e.message);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isSupport = item.sender_type === 'ADMIN';

    return (
      <View style={[
        styles.messageContainer,
        isSupport ? styles.supportMessageContainer : styles.userMessageContainer,
      ]}>
        {isSupport && (
          <View style={styles.supportAvatar}>
            <Icon name="headset" size={20} color="#FF1493" />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isSupport ? styles.supportBubble : styles.userBubble,
        ]}>
          <Text style={[
            styles.messageText,
            isSupport ? styles.supportText : styles.userText,
          ]}>
            {item.message}
          </Text>
          <Text style={styles.timestamp}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CurvedHeader
        title="Chat Support"
        navigation={navigation}
        showBack
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF1493" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={(
              <View style={styles.emptyContainer}>
                <Icon name="chatbubbles-outline" size={40} color="#ddd" />
                <Text style={styles.emptyText}>
                  Send us a message and our support team will get back to you.
                </Text>
              </View>
            )}
          />
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FF1493" />
            ) : (
              <Icon
                name="send"
                size={22}
                color={inputText.trim() ? '#FF1493' : '#ccc'}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 13.5,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  messagesList: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  supportMessageContainer: {
    justifyContent: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  supportAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 20,
  },
  supportBubble: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#FF1493',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  supportText: {
    color: '#333',
  },
  userText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
     paddingBottom: Platform.OS === 'ios' ? 40 : 40,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: '#333',
  },
  sendButton: {
    padding: 8,
    marginLeft: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatSupportScreen;
