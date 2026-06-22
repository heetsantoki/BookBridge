import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketNotification {
  type: 'RequestReceived' | 'RequestAccepted' | 'NewMessage' | 'WishlistAvailable' | 'System';
  title: string;
  message: string;
  link?: string;
}

interface SocketContextType {
  socket: Socket | null;
  online: boolean;
  notifications: SocketNotification[];
  addLocalNotification: (notification: SocketNotification) => void;
  clearNotifications: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [online, setOnline] = useState(false);
  const [notifications, setNotifications] = useState<SocketNotification[]>([]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketInstance = io(SOCKET_URL);

    socketInstance.on('connect', () => {
      console.log('Socket connected to backend');
      setOnline(true);
      socketInstance.emit('setup', user.id);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setOnline(false);
    });

    socketInstance.on('notification_received', (notification: SocketNotification) => {
      console.log('Socket notification received:', notification);
      setNotifications(prev => [notification, ...prev]);

      // Play soft notification sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
        audio.volume = 0.3;
        audio.play();
      } catch (err) {
        console.log('Audio playback blocked by browser policies');
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  const addLocalNotification = (notif: SocketNotification) => {
    setNotifications(prev => [notif, ...prev]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SocketContext.Provider value={{
      socket,
      online,
      notifications,
      addLocalNotification,
      clearNotifications
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
