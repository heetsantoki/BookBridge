import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, MessageSquare, BookOpen, RefreshCw, Mail, Phone, ShieldCheck } from 'lucide-react';

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active chat queries
  const partnerQueryId = searchParams.get('partnerId');
  const resourceQueryId = searchParams.get('resourceId');

  // Chat data states
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Typing states
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<any | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async (selectFirst = false) => {
    setLoadingChats(true);
    try {
      const res = await axios.get('http://localhost:5000/api/messages/conversations');
      if (res.data.success) {
        setConversations(res.data.conversations);
        
        // Handle selecting chat based on query strings or first item
        if (partnerQueryId && resourceQueryId) {
          const matchingChat = res.data.conversations.find((c: any) => 
            c.otherUser._id === partnerQueryId && c.resource._id === resourceQueryId
          );
          if (matchingChat) {
            setSelectedChat(matchingChat);
          } else {
            // Initiate a temp chat since no messages exist yet
            await createTemporaryChat(partnerQueryId, resourceQueryId);
          }
        } else if (selectFirst && res.data.conversations.length > 0) {
          setSelectedChat(res.data.conversations[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChats(false);
    }
  };

  const createTemporaryChat = async (_partnerId: string, resourceId: string) => {
    try {
      const partnerRes = await axios.get(`http://localhost:5000/api/resources/${resourceId}`);

      if (partnerRes.data.success) {
        const tempChat = {
          conversationId: 'temp_chat_id',
          otherUser: partnerRes.data.owner,
          resource: partnerRes.data.resource,
          lastMessage: null,
          contactShared: partnerRes.data.contactShared
        };
        setSelectedChat(tempChat);
      }
    } catch (err) {
      console.error('Failed to resolve temporary chat:', err);
    }
  };

  const fetchMessages = async (chat: any) => {
    if (!chat) return;
    setLoadingMsgs(true);
    try {
      if (chat.conversationId === 'temp_chat_id') {
        setMessages([]);
        setLoadingMsgs(false);
        return;
      }
      const res = await axios.get(`http://localhost:5000/api/messages/conversation/${chat.otherUser._id}/${chat.resource._id}`);
      if (res.data.success) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  // Setup sockets
  useEffect(() => {
    if (!socket || !selectedChat) return;

    socket.emit('join_chat', selectedChat.conversationId);

    const handleIncomingMessage = (newMessage: any) => {
      // If message belongs to selected chat
      if (newMessage.conversationId === selectedChat.conversationId) {
        setMessages(prev => [...prev, newMessage]);
      }
      // Update conversations sidebar list
      fetchConversations(false);
    };

    const handleTypingEvent = (room: string) => {
      if (room === selectedChat.conversationId) {
        setPartnerTyping(true);
      }
    };

    const handleStopTypingEvent = (room: string) => {
      if (room === selectedChat.conversationId) {
        setPartnerTyping(false);
      }
    };

    socket.on('message_received', handleIncomingMessage);
    socket.on('typing', handleTypingEvent);
    socket.on('stop_typing', handleStopTypingEvent);

    return () => {
      socket.off('message_received', handleIncomingMessage);
      socket.off('typing', handleTypingEvent);
      socket.off('stop_typing', handleStopTypingEvent);
    };
  }, [socket, selectedChat]);

  useEffect(() => {
    fetchConversations(true);
  }, [partnerQueryId, resourceQueryId]);

  useEffect(() => {
    fetchMessages(selectedChat);
  }, [selectedChat]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const handleTypingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (!socket || !selectedChat) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', selectedChat.conversationId);
    }

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(() => {
      socket.emit('stop_typing', selectedChat.conversationId);
      setIsTyping(false);
    }, 2000);

    setTypingTimeout(timeout);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;

    const content = messageInput;
    setMessageInput('');

    // Emit stop typing immediately
    if (socket) {
      socket.emit('stop_typing', selectedChat.conversationId);
      setIsTyping(false);
    }

    try {
      const res = await axios.post('http://localhost:5000/api/messages', {
        receiverId: selectedChat.otherUser._id || selectedChat.otherUser.id,
        resourceId: selectedChat.resource._id,
        content
      });

      if (res.data.success) {
        const newMsgObj = res.data.message;

        // If it was a temporary chat, fetch conversations again to get the real conversationId
        if (selectedChat.conversationId === 'temp_chat_id') {
          setSearchParams({}); // Clear queries
          const newChatObj = {
            conversationId: newMsgObj.conversationId,
            otherUser: selectedChat.otherUser,
            resource: selectedChat.resource,
            lastMessage: newMsgObj,
            contactShared: selectedChat.contactShared
          };
          setSelectedChat(newChatObj);
          setMessages([newMsgObj]);
          fetchConversations(false);
        } else {
          setMessages(prev => [...prev, newMsgObj]);
          // Notify backend via socket
          if (socket) {
            socket.emit('new_message', newMsgObj);
          }
          // Update conversations sidebar lastMessage text
          setConversations(prev => 
            prev.map(c => c.conversationId === selectedChat.conversationId ? { ...c, lastMessage: newMsgObj } : c)
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-left">
      <div className="glass-card flex h-[calc(100vh-12rem)] min-h-[450px] overflow-hidden">
        
        {/* CHAT CHANNELS SIDEBAR */}
        <aside className="w-80 border-r border-dark-850 flex flex-col h-full bg-dark-950/20 shrink-0">
          <div className="p-4 border-b border-dark-850 flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5"><MessageSquare className="h-4.5 w-4.5 text-brand-400" /> Active Chats</span>
            <button onClick={() => fetchConversations(false)} className="p-1 hover:bg-dark-900 rounded">
              <RefreshCw className="h-3.5 w-3.5 text-dark-400" />
            </button>
          </div>
          
          <div className="flex-grow overflow-y-auto divide-y divide-dark-900/50">
            {loadingChats ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="h-5 w-5 text-brand-400 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-dark-500">
                No active conversations yet
              </div>
            ) : (
              conversations.map((chat) => {
                const isSelected = selectedChat && selectedChat.conversationId === chat.conversationId;
                return (
                  <div
                    key={chat.conversationId}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 cursor-pointer hover:bg-dark-900/30 flex gap-3 transition-colors text-left items-start ${
                      isSelected ? 'bg-brand-500/5 border-l-2 border-brand-500' : ''
                    }`}
                  >
                    <img src={chat.otherUser.avatar} className="h-9 w-9 rounded-lg bg-dark-800" alt="" />
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold truncate text-dark-100">{chat.otherUser.name}</span>
                        {chat.lastMessage && (
                          <span className="text-[9px] text-dark-500">
                            {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-brand-300 font-medium truncate block mt-0.5">{chat.resource.title}</span>
                      {chat.lastMessage && (
                        <p className="text-[11px] text-dark-400 truncate mt-1 leading-normal">
                          {chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* CHAT DISPLAY BODY */}
        <main className="flex-grow flex flex-col h-full bg-dark-900/10">
          {selectedChat ? (
            <>
              {/* Active Chat Header */}
              <div className="p-4 border-b border-dark-850 bg-dark-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={selectedChat.otherUser.avatar} className="h-9 w-9 rounded-lg bg-dark-800" alt="" />
                  <div>
                    <span className="text-xs font-bold text-dark-100">{selectedChat.otherUser.name}</span>
                    <span className="text-[10px] text-dark-450 block flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-brand-400" /> Listing: {selectedChat.resource.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shared Contact Credentials alert bar */}
              {selectedChat.contactShared && (
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-3 text-xs text-emerald-400 flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span>Trade Approved! Contact Unlocked: </span>
                  <span className="flex items-center gap-1 ml-2 font-bold"><Mail className="h-3.5 w-3.5" /> {selectedChat.otherUser.email}</span>
                  {selectedChat.otherUser.phone && (
                    <span className="flex items-center gap-1 ml-3 font-bold"><Phone className="h-3.5 w-3.5" /> {selectedChat.otherUser.phone}</span>
                  )}
                </div>
              )}

              {/* Messages container */}
              <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-4">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-20">
                    <RefreshCw className="h-6 w-6 text-brand-400 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-20 text-xs text-dark-500">
                    Send a message to start negotiating trade details.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender._id.toString() === user?.id || msg.sender === user?.id;
                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col max-w-[70%] rounded-2xl p-3 text-xs leading-relaxed ${
                          isOwn
                            ? 'bg-brand-600 text-white rounded-tr-none self-end'
                            : 'bg-dark-900 border border-dark-850 text-dark-200 rounded-tl-none self-start'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <span className={`text-[8px] mt-1 self-end ${isOwn ? 'text-brand-200' : 'text-dark-550'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                {/* Typing state bubble */}
                {partnerTyping && (
                  <div className="bg-dark-900 border border-dark-850 text-dark-400 rounded-2xl rounded-tl-none p-2.5 text-[10px] self-start flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.4s]" />
                    <span>typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-dark-850 bg-dark-950/20 flex gap-3">
                <input
                  type="text"
                  placeholder="Type message here..."
                  className="glass-input flex-grow text-xs py-2.5"
                  value={messageInput}
                  onChange={handleTypingInput}
                />
                <button type="submit" className="glass-btn-primary p-2.5 flex items-center justify-center shrink-0 rounded-xl">
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
              <MessageSquare className="h-12 w-12 text-dark-700" />
              <h3 className="text-sm font-bold text-dark-400">No chat room selected</h3>
              <p className="text-xs text-dark-500 max-w-xs leading-normal">
                Select an active conversation on the left, or initiate one from details pages.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
