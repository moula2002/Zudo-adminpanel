import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { BASE_DOMAIN, clearApiCache } from '../utils/api';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  useEffect(() => {
    // In local dev, BASE_DOMAIN is localhost:5173, and vite proxies /socket.io
    const newSocket = io(BASE_DOMAIN, {
      withCredentials: true,
      transports: ['polling', 'websocket']
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connected');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    const triggerRefresh = (eventName, data) => {
      console.log(`Real-time update received (${eventName}):`, data);
      clearApiCache('/orders');
      clearApiCache();
      setRefreshFlag(prev => prev + 1);
    };

    newSocket.on('data_updated', (data) => triggerRefresh('data_updated', data));
    newSocket.on('order:updated', (data) => triggerRefresh('order:updated', data));
    newSocket.on('order:status_changed', (data) => triggerRefresh('order:status_changed', data));
    newSocket.on('order:delivered', (data) => triggerRefresh('order:delivered', data));

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, refreshFlag }}>
      {children}
    </SocketContext.Provider>
  );
};
