import React from "react";

export const UnreadMessagesContext = React.createContext({
  unreadCount: 0,
  setUnreadCount: () => {},
  incrementUnreadCount: () => {},
  decrementUnreadCount: () => {},
});

export function UnreadMessagesProvider({ children }) {
  const [unreadCount, setUnreadCount] = React.useState(0);

  const incrementUnreadCount = React.useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);

  const decrementUnreadCount = React.useCallback(() => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const value = React.useMemo(() => ({
    unreadCount,
    setUnreadCount,
    incrementUnreadCount,
    decrementUnreadCount,
  }), [unreadCount, incrementUnreadCount, decrementUnreadCount]);

  return (
    <UnreadMessagesContext.Provider value={value}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export const useUnreadMessages = () => {
  const context = React.useContext(UnreadMessagesContext);
  if (!context) {
    throw new Error("useUnreadMessages must be used within an UnreadMessagesProvider");
  }
  return context;
};
