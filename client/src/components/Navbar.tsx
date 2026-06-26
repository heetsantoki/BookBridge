import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { BookOpen, MessageSquare, Bell, User, LogOut, ChevronDown, ShieldAlert, Award, Plus } from 'lucide-react';
import axios from 'axios';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<any[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch initial notifications and unread message counts
  const fetchCountsAndNotifs = async () => {
    if (!user) return;
    try {
      const [msgRes, notifRes] = await Promise.all([
        axios.get('http://localhost:5000/api/messages/unread-count'),
        axios.get('http://localhost:5000/api/notifications')
      ]);
      if (msgRes.data.success) setUnreadMsgCount(msgRes.data.unreadCount);
      if (notifRes.data.success) setLocalNotifications(notifRes.data.notifications);
    } catch (err) {
      console.error('Failed to fetch counts:', err);
    }
  };

  useEffect(() => {
    fetchCountsAndNotifs();
  }, [user, location.pathname]);

  // Hook into live socket events to update counts and local notifications lists
  useEffect(() => {
    if (!socket) return;

    const handleNewMessageNotification = () => {
      setUnreadMsgCount(prev => prev + 1);
      fetchCountsAndNotifs();
    };

    const handleNotification = (notif: any) => {
      setLocalNotifications(prev => [notif, ...prev]);
      if (notif.type === 'NewMessage') {
        setUnreadMsgCount(prev => prev + 1);
      }
    };

    socket.on('notification_received', handleNotification);
    socket.on('message_received', handleNewMessageNotification);

    return () => {
      socket.off('notification_received', handleNotification);
      socket.off('message_received', handleNewMessageNotification);
    };
  }, [socket]);

  const markAllNotificationsAsRead = async () => {
    try {
      await axios.put('http://localhost:5000/api/notifications/read-all');
      setLocalNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${notif._id}/read`);
      setLocalNotifications(prev =>
        prev.map(n => (n._id === notif._id ? { ...n, isRead: true } : n))
      );
      setShowNotifications(false);
      if (notif.link) {
        navigate(notif.link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unreadNotifsCount = localNotifications.filter(n => !n.isRead).length;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-dark-800/80 bg-dark-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 shadow-glass-primary">
                <BookOpen className="h-5 w-5 text-white animate-pulse-slow" />
              </div>
              <span className="font-outfit text-xl font-extrabold tracking-tight bg-gradient-to-r from-brand-300 via-brand-100 to-accent-400 bg-clip-text text-transparent">
                BookBridge
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className={`text-sm font-semibold transition-colors duration-200 ${
                  isActive('/') ? 'text-brand-400' : 'text-dark-300 hover:text-dark-100'
                }`}
              >
                Browse Resources
              </Link>
              <Link
                to="/dashboard"
                className={`text-sm font-semibold transition-colors duration-200 ${
                  isActive('/dashboard') ? 'text-brand-400' : 'text-dark-300 hover:text-dark-100'
                }`}
              >
                My Exchanges
              </Link>
              <Link
                to="/chat"
                className={`text-sm font-semibold transition-colors duration-200 flex items-center gap-1.5 ${
                  isActive('/chat') ? 'text-brand-400' : 'text-dark-300 hover:text-dark-100'
                }`}
              >
                Chat
                {unreadMsgCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                    {unreadMsgCount}
                  </span>
                )}
              </Link>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`text-sm font-semibold transition-colors duration-200 flex items-center gap-1.5 ${
                    isActive('/admin') ? 'text-red-400' : 'text-dark-300 hover:text-red-300'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4" />
                  Admin Portal
                </Link>
              )}
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Share Resource Button */}
                <Link
                  to="/create-listing"
                  className="hidden sm:inline-flex items-center gap-1.5 glass-btn-primary !py-1.5 !px-3.5 !text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5" /> Share Resource
                </Link>

                {/* Notification Dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      if (!showNotifications) markAllNotificationsAsRead();
                    }}
                    className="relative p-2 text-dark-300 hover:text-dark-100 transition-colors duration-200 hover:bg-dark-900/60 rounded-xl"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotifsCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-accent-500 ring-2 ring-dark-950 animate-ping" />
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border border-dark-800 bg-dark-900 shadow-glass backdrop-blur-lg overflow-hidden animate-slide-up">
                      <div className="px-4 py-3 border-b border-dark-800 flex items-center justify-between">
                        <span className="text-sm font-bold">Notifications</span>
                        {unreadNotifsCount > 0 && (
                          <span className="text-[10px] bg-accent-500/10 text-accent-400 border border-accent-500/25 px-2 py-0.5 rounded-full font-bold">
                            {unreadNotifsCount} New
                          </span>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-dark-800/50">
                        {localNotifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-dark-500">
                            No notifications yet
                          </div>
                        ) : (
                          localNotifications.map((notif) => (
                            <div
                              key={notif._id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3 text-left hover:bg-dark-800/40 cursor-pointer transition-colors duration-200 flex flex-col gap-0.5 ${
                                !notif.isRead ? 'bg-brand-500/5' : ''
                              }`}
                            >
                              <span className="text-xs font-bold text-dark-100">{notif.title}</span>
                              <span className="text-[11px] text-dark-400 leading-normal">{notif.message}</span>
                              <span className="text-[9px] text-dark-500 self-end mt-1">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 p-1.5 hover:bg-dark-900/60 rounded-xl transition-all duration-200 border border-transparent hover:border-dark-800"
                  >
                    <img
                      src={user.avatar}
                      alt="avatar"
                      className="h-8 w-8 rounded-lg bg-dark-800 object-cover"
                    />
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-xs font-bold leading-tight">{user.name}</span>
                      <span className="text-[10px] text-dark-400 leading-none">
                        {user.isVerified ? 'Verified Student' : 'Unverified'}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-dark-400" />
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-dark-800 bg-dark-900 shadow-glass backdrop-blur-lg overflow-hidden divide-y divide-dark-800 animate-slide-up">
                      <div className="px-4 py-3">
                        <p className="text-xs text-dark-400">Signed in as</p>
                        <p className="text-sm font-bold truncate text-dark-100">{user.email}</p>
                        {user.isVerified && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-accent-400 font-semibold uppercase tracking-wide bg-accent-500/10 px-2 py-0.5 rounded border border-accent-500/20">
                            <Award className="h-3 w-3" /> College Verified
                          </span>
                        )}
                      </div>
                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-dark-300 hover:text-dark-100 hover:bg-dark-800/40"
                        >
                          <User className="h-4 w-4" /> My Profile & Listings
                        </Link>
                        <Link
                          to="/chat"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-dark-300 hover:text-dark-100 hover:bg-dark-800/40 md:hidden"
                        >
                          <MessageSquare className="h-4 w-4" /> Live Chat
                        </Link>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            logout();
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 text-left"
                        >
                          <LogOut className="h-4 w-4" /> Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/auth" className="glass-btn-primary py-2 px-5 text-sm">
                Get Started
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
