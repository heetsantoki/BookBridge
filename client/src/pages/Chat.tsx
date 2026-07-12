import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, MessageSquare, BookOpen, RefreshCw, Mail, Phone, ShieldCheck, Image, X } from 'lucide-react';
import { getImageUrl } from '../utils/image';

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

  // Photo share states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCancelImage = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

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
            c.otherUser?._id === partnerQueryId && c.resource?._id === resourceQueryId
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
    if (!chat || !chat.otherUser || !chat.resource) return;
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
    if ((!messageInput.trim() && !selectedImage) || !selectedChat) return;

    const content = messageInput;
    setMessageInput('');

    // Emit stop typing immediately
    if (socket) {
      socket.emit('stop_typing', selectedChat.conversationId);
      setIsTyping(false);
    }

    try {
      let imageUrl = '';
      if (selectedImage) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('image', selectedImage);
        const uploadRes = await axios.post('http://localhost:5000/api/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data.success) {
          imageUrl = uploadRes.data.imageUrl;
        }
      }

      if (!selectedChat?.otherUser || !selectedChat?.resource) {
        return;
      }

      const res = await axios.post('http://localhost:5000/api/messages', {
        receiverId: selectedChat.otherUser._id || selectedChat.otherUser.id,
        resourceId: selectedChat.resource._id,
        content: content || (imageUrl ? '[Photo]' : ''),
        image: imageUrl
      });

      if (res.data.success) {
        const newMsgObj = res.data.message;
        handleCancelImage(); // Reset photo state

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
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-left animate-fade-in">
      <div className="glass-card flex h-[calc(100vh-12rem)] min-h-[450px] overflow-hidden border border-white/[0.06] bg-dark-900/40 shadow-2xl">

        {/* CHAT CHANNELS SIDEBAR */}
        <aside className="w-80 border-r border-white/[0.06] flex flex-col h-full bg-dark-950/30 shrink-0">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-white"><MessageSquare className="h-4.5 w-4.5 text-brand-400" /> Active Chats</span>
            <button onClick={() => fetchConversations(false)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
              <RefreshCw className="h-3.5 w-3.5 text-dark-450" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto divide-y divide-white/[0.04]">
            {loadingChats ? (
              <div className="flex flex-col animate-pulse">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="p-4 border-b border-white/[0.04] flex gap-3 text-left items-start">
                    <div className="h-9 w-9 rounded-lg bg-white/[0.02] shrink-0" />
                    <div className="flex-grow flex flex-col gap-2 min-w-0">
                      <div className="flex justify-between items-center">
                        <div className="h-3 bg-white/[0.02] rounded w-24" />
                        <div className="h-2.5 bg-white/[0.02] rounded w-8" />
                      </div>
                      <div className="h-3 bg-white/[0.02] rounded w-32" />
                      <div className="h-2.5 bg-white/[0.02] rounded w-full mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-dark-500 font-bold uppercase tracking-wider italic">
                No active conversations yet
              </div>
            ) : (
              conversations.map((chat) => {
                const isSelected = selectedChat && selectedChat.conversationId === chat.conversationId;
                return (
                  <div
                    key={chat.conversationId}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 cursor-pointer hover:bg-white/[0.02] flex gap-3 transition-all duration-200 text-left items-start ${isSelected ? 'bg-brand-500/10 border-l-4 border-brand-500' : 'border-l-4 border-transparent'
                      }`}
                  >
                    <img src={chat.otherUser?.avatar} className="h-9 w-9 rounded-lg bg-dark-950 border border-white/[0.06] object-cover" alt="" />
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold truncate text-dark-100">{chat.otherUser?.name || 'Unknown User'}</span>
                        {chat.lastMessage && (
                          <span className="text-[9px] text-dark-500 font-bold uppercase tracking-wider">
                            {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-brand-350 font-bold uppercase tracking-wider truncate block mt-1">{chat.resource?.title || 'Deleted Resource'}</span>
                      {chat.lastMessage && (
                        <p className="text-[11px] text-dark-400 truncate mt-1 leading-normal font-medium">
                          {chat.lastMessage.image ? '📷 Sent a photo' : chat.lastMessage.content}
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
              <div className="p-4 border-b border-white/[0.06] bg-dark-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={selectedChat.otherUser?.avatar} className="h-9 w-9 rounded-lg bg-dark-950 border border-white/[0.06] object-cover" alt="" />
                  <div>
                    <span className="text-xs font-extrabold text-white">{selectedChat.otherUser?.name || 'Unknown User'}</span>
                    <span className="text-[10px] text-dark-440 font-medium block flex items-center gap-1 mt-0.5">
                      <BookOpen className="h-3.5 w-3.5 text-brand-400" /> Listing: {selectedChat.resource?.title || 'Deleted Resource'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shared Contact Credentials alert bar */}
              {selectedChat.contactShared && (
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-3.5 text-xs text-emerald-400 flex flex-wrap items-center gap-2 font-medium shadow-glow-emerald">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
                  <span className="font-bold uppercase tracking-wider text-[10px]">Trade Approved! Contacts: </span>
                  <span className="flex items-center gap-1.5 ml-2 font-extrabold text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg"><Mail className="h-3.5 w-3.5 text-emerald-400" /> {selectedChat.otherUser.email}</span>
                  {selectedChat.otherUser.phone && (
                    <span className="flex items-center gap-1.5 ml-1 font-extrabold text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg"><Phone className="h-3.5 w-3.5 text-emerald-400" /> {selectedChat.otherUser.phone}</span>
                  )}
                </div>
              )}

              {/* Messages container */}
              <div className="flex-grow overflow-y-auto p-5 flex flex-col gap-4">
                {loadingMsgs ? (
                  <div className="flex flex-col gap-4 animate-pulse">
                    {[...Array(4)].map((_, index) => {
                      const isOwn = index % 2 === 0;
                      return (
                        <div
                          key={index}
                          className={`flex flex-col max-w-[50%] rounded-2xl p-4 gap-2.5 border ${isOwn
                              ? 'bg-brand-650/10 border-brand-500/10 rounded-tr-none self-end'
                              : 'bg-white/[0.02] border-white/[0.05] rounded-tl-none self-start'
                            }`}
                          style={{ width: isOwn ? '180px' : '220px' }}
                        >
                          <div className="h-3.5 bg-white/[0.02] rounded w-full" />
                          <div className="h-3 bg-white/[0.02] rounded w-3/4" />
                        </div>
                      );
                    })}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-20 text-xs text-dark-500 font-bold uppercase tracking-wider italic">
                    Send a message to start negotiating trade details.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender._id.toString() === user?.id || msg.sender === user?.id;
                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col max-w-[70%] rounded-2xl p-3 text-xs leading-relaxed transition-transform duration-200 hover:scale-[1.01] ${isOwn
                            ? 'bg-brand-600 text-white rounded-tr-none self-end shadow-glow-indigo/5 border border-brand-500/20'
                            : 'bg-white/[0.03] border border-white/[0.06] text-dark-150 rounded-2xl rounded-tl-none self-start'
                          }`}
                      >
                        {msg.image && (
                          <img
                            src={getImageUrl(msg.image)}
                            alt="Shared"
                            className="max-w-xs max-h-48 object-cover rounded-lg mb-2 cursor-pointer border border-white/[0.06] hover:opacity-90 transition-opacity"
                            onClick={() => setEnlargedImage(msg.image)}
                          />
                        )}
                        {msg.content && <p className="font-medium">{msg.content}</p>}
                        <span className={`text-[8px] mt-1.5 self-end font-bold uppercase tracking-wider ${isOwn ? 'text-brand-200' : 'text-dark-500'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                {/* Typing state bubble */}
                {partnerTyping && (
                  <div className="bg-white/[0.02] border border-white/[0.06] text-dark-400 rounded-2xl rounded-tl-none p-2.5 text-[10px] self-start flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0.4s]" />
                    <span>typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Image Preview Area */}
              {imagePreview && (
                <div className="px-4 py-2 border-t border-white/[0.06] bg-dark-950/40 flex items-center gap-3 relative">
                  <div className="relative">
                    <img src={imagePreview} className="h-16 w-16 object-cover rounded-lg border border-white/[0.08]" alt="Preview" />
                    <button
                      type="button"
                      onClick={handleCancelImage}
                      className="absolute -top-1.5 -right-1.5 bg-red-650 hover:bg-red-700 text-white rounded-full p-0.5 shadow-md"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-[10px] text-dark-400 font-bold uppercase tracking-wider">
                    {uploadingImage ? 'Uploading image...' : 'Image selected. Click send to share.'}
                  </div>
                </div>
              )}

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/[0.06] bg-dark-950/20 flex gap-3 items-center">
                <label className="cursor-pointer p-2.5 text-dark-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0">
                  <Image className="h-4.5 w-4.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={uploadingImage}
                  />
                </label>
                <input
                  type="text"
                  placeholder={uploadingImage ? "Uploading photo..." : "Type message here..."}
                  className="glass-input flex-grow text-xs py-2.5 border-white/[0.08]"
                  value={messageInput}
                  onChange={handleTypingInput}
                  disabled={uploadingImage}
                />
                <button
                  type="submit"
                  disabled={uploadingImage || (!messageInput.trim() && !selectedImage)}
                  className="glass-btn-primary p-2.5 flex items-center justify-center shrink-0 rounded-xl hover:-translate-y-0.5 shadow-glow-indigo"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20 animate-fade-in">
              <MessageSquare className="h-12 w-12 text-dark-600 animate-pulse" />
              <h3 className="text-xs font-bold text-dark-300 uppercase tracking-widest">No chat room selected</h3>
              <p className="text-xs text-dark-500 max-w-xs leading-relaxed font-medium">
                Select an active conversation on the left, or initiate one from details pages.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Enlarged Image Modal Overlay */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-12 right-0 bg-dark-900/80 hover:bg-red-650 hover:border-red-500 text-white rounded-xl p-2.5 border border-white/[0.08] z-10 transition-colors shadow-lg"
              title="Close Viewer"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={getImageUrl(enlargedImage)}
              alt="Enlarged shared content"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/[0.08] shadow-2xl bg-dark-950"
            />
          </div>
        </div>
      )}
    </div>
  );
};
