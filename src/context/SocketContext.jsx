import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, clearApiCache } from '../utils/api';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('zudo_admin_token'));
  const [refreshFlag, setRefreshFlag] = useState(0);
  const refreshTimerRef = useRef(null);
  const errorLoggedRef = useRef(false);

  useEffect(() => {
    const handleAuthChange = () => {
      setAuthToken(localStorage.getItem('zudo_admin_token'));
    };
    window.addEventListener('adminAuthChange', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('adminAuthChange', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    // Do not initiate socket connection on public unauthenticated views (e.g. Login page)
    const isLoginPage = typeof window !== 'undefined' && window.location.pathname.includes('/login');
    if (!authToken || isLoginPage) {
      if (socket) {
        socket.close();
        setSocket(null);
      }
      return;
    }

    const socketUrl = SOCKET_URL || window.location.origin;

    // Connect via native WebSocket ONLY to eliminate HTTP polling CORS overhead entirely
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connected');
      errorLoggedRef.current = false;
    });

    newSocket.on('connect_error', (error) => {
      // Log connection note once instead of spamming on every retry
      if (!errorLoggedRef.current) {
        console.warn('Socket connection note (reconnecting in background):', error.message || error);
        errorLoggedRef.current = true;
      }
    });

    newSocket.on('disconnect', (reason) => {
      if (reason !== 'io client disconnect') {
        console.log('Socket.IO disconnected:', reason);
      }
    });

    const triggerRefresh = (eventName, data) => {
      console.log(`Real-time update received (${eventName}):`, data);
      clearApiCache('/orders');
      clearApiCache();
      // Debounce refresh flag to prevent cascade requests and rate limiting
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        setRefreshFlag(prev => prev + 1);
      }, 300);
    };

    newSocket.on('data_updated', (data) => triggerRefresh('data_updated', data));
    newSocket.on('order:updated', (data) => triggerRefresh('order:updated', data));
    newSocket.on('order:status_changed', (data) => triggerRefresh('order:status_changed', data));
    newSocket.on('order:delivered', (data) => triggerRefresh('order:delivered', data));

    setSocket(newSocket);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      newSocket.close();
    };
  }, [authToken]);

  return (
    <SocketContext.Provider value={{ socket, refreshFlag }}>
      {children}
    </SocketContext.Provider>
  );
};
