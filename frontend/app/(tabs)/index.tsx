import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Dimensions,
  Animated,
  StatusBar,
  Keyboard,
} from 'react-native';
import ProfileScreen from './profile'; // Import ProfileScreen from separate file
import { ThemeProvider, useTheme } from './themeContext'; // Import from new file

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Default status bar height values
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

const BOTTOM_SAFE_AREA = Platform.OS === 'ios' ? 34 : 0;

type Message = {
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
};

type ChatSession = {
  id: string;
  title: string;
  date: Date;
  messages: Message[];
};

type UserProfile = {
  name: string;
  email: string;
  major: string;
  year: string;
  preferences: {
    notifications: boolean;
    darkMode: boolean;
  };
};

const AdvisorAI = () => {
  // Default user profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "John Doe",
    email: "john.doe@university.edu",
    major: "Computer Science",
    year: "Junior",
    preferences: {
      notifications: true,
      darkMode: true,
    }
  });

  // Access theme context - now using the imported hook
  const { isDarkMode, toggleTheme, theme } = useTheme();

  // Update theme when profile preference changes
  useEffect(() => {
    if (isDarkMode !== userProfile.preferences.darkMode) {
      toggleTheme();
    }
  }, []);
  
  // Sample previous chat sessions
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'Course Registration Help',
      date: new Date(Date.now() - 86400000 * 2), // 2 days ago
      messages: [
        {
          text: "Hello! How can I help with course registration?",
          sender: 'ai',
          timestamp: new Date(Date.now() - 86400000 * 2),
        },
      ],
    },
    {
      id: '2',
      title: 'Minor Requirements',
      date: new Date(Date.now() - 86400000 * 5), // 5 days ago
      messages: [
        {
          text: "Let me tell you about minor requirements",
          sender: 'ai',
          timestamp: new Date(Date.now() - 86400000 * 5),
        },
      ],
    },
  ]);

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Hello! I'm AdvisorAI, your personal college advisor. I can help you with information about courses, minors, ULCs, CS tracks, and more. How can I assist you today?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [showProfileScreen, setShowProfileScreen] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  
  // Animation value for sidebar
  const sidebarAnimation = useRef(new Animated.Value(0)).current;
  // Animation value for categories container
  const categoriesAnimation = useRef(new Animated.Value(1)).current;

  // Check if there are any user messages in the chat
  const hasUserMessages = messages.some(message => message.sender === 'user');

  // Should hide categories if user is typing OR there are user messages
  const shouldHideCategories = isTyping || hasUserMessages;

  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: isSidebarOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSidebarOpen]);

  useEffect(() => {
    Animated.timing(categoriesAnimation, {
      toValue: shouldHideCategories ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [shouldHideCategories]);

  // Update user profile when theme changes
  useEffect(() => {
    setUserProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        darkMode: isDarkMode
      }
    }));
  }, [isDarkMode]);

  const sidebarWidth = SCREEN_WIDTH * 0.75;
  
  const sidebarTranslateX = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-sidebarWidth, 0],
  });

  const overlayOpacity = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });
  
  const categoriesOpacity = categoriesAnimation;
  const categoriesHeight = categoriesAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_HEIGHT * 0.1],
  });

  const categories = [
    { name: 'Courses', icon: '📚' },
    { name: 'Minors', icon: '🎓' },
    { name: 'ULCs', icon: '📝' },
    { name: 'CS Tracks', icon: '💻' },
    { name: 'Deadlines', icon: '📅' },
  ];

  const getCategoryResponse = (category: string) => {
    setIsLoading(true);
    // Dismiss keyboard when a category is selected
    Keyboard.dismiss();
    
    setTimeout(() => {
      let response = '';
      switch (category) {
        case 'Courses':
          response = "I can help you find course information. Ask me about specific courses, prerequisites, or course recommendations based on your interests.";
          break;
        case 'Minors':
          response = "I can provide information about available minors, requirements, and how they complement your major.";
          break;
        case 'ULCs':
          response = "I have information about Upper Level Courses, their prerequisites, and which ones fulfill specific graduation requirements.";
          break;
        case 'CS Tracks':
          response = "I can explain the different CS specialization tracks available, their required courses, and career paths they align with.";
          break;
        case 'Deadlines':
          response = "I can inform you about important academic deadlines including registration periods, drop/add deadlines, and application dates.";
          break;
        default:
          response = "I don't have information about that category yet. Please ask me something else.";
      }
      const userMessage: Message = {
        text: `Tell me about ${category}`,
        sender: 'user',
        timestamp: new Date(),
      };
      const aiMessage: Message = {
        text: response,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, userMessage, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    // Dismiss keyboard when send button is clicked
    Keyboard.dismiss();
    
    const userMessage: Message = {
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputText('');
    setIsTyping(false);
    setIsLoading(true);
    setTimeout(() => {
      const aiMessage: Message = {
        text: `You asked: "${inputText}". I'm processing your request. For now, try asking about courses, minors, or deadlines!`,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleTextInputChange = (text: string) => {
    setInputText(text);
    setIsTyping(text.length > 0);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const loadChatSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setMessages(session.messages);
      setCurrentChatId(sessionId);
    }
    setIsSidebarOpen(false);
  };

  const startNewChat = () => {
    setMessages([
      {
        text: "Hello! I'm AdvisorAI, your personal college advisor. I can help you with information about courses, minors, ULCs, CS tracks, and more. How can I assist you today?",
        sender: 'ai',
        timestamp: new Date(),
      },
    ]);
    setCurrentChatId(null);
    setIsSidebarOpen(false);
  };

  const toggleSidebar = () => {
    // Dismiss keyboard when sidebar is toggled
    Keyboard.dismiss();
    setIsSidebarOpen(!isSidebarOpen);
  };

  const openProfileScreen = () => {
    setIsSidebarOpen(false);
    setShowProfileScreen(true);
  };

  // Pass updated theme to ProfileScreen
  if (showProfileScreen) {
    return (
      <ProfileScreen 
        profile={userProfile} 
        setProfile={setUserProfile} 
        onBack={() => setShowProfileScreen(false)} 
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
    );
  }

  // Create dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    // ... All your dynamic styles remain the same
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
      position: 'relative',
      backgroundColor: theme.headerBackground,
      // Add padding for status bar
      paddingTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT + 16 : 16 + STATUS_BAR_HEIGHT,
    },
    menuIcon: {
      fontSize: 24,
      color: theme.text,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    categoryButton: {
      padding: 8,
      marginHorizontal: 8,
      backgroundColor: theme.surface,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 80,
    },
    categoryText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    userBubble: {
      backgroundColor: theme.userBubble,
      alignSelf: 'flex-end',
      marginLeft: 50,
      paddingRight: 42,
      paddingBottom: 20,
      minWidth: 70,
    },
    aiBubble: {
      backgroundColor: theme.aiBubble,
      alignSelf: 'flex-start',
      marginRight: 50,
      maxWidth: '85%',
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
      color: theme.text,
    },
    // New style for user message text that's always white
    userMessageText: {
      fontSize: 16,
      lineHeight: 22,
      color: '#FFFFFF', // Always white
    },
    timestamp: {
      fontSize: 12,
      color: theme.secondary,
      alignSelf: 'flex-end',
      marginTop: 4,
    },
    userTimestamp: {
      fontSize: 12,
      color: '#FFFFFF', // Always white for user bubble
      position: 'absolute',
      right: 12,
      bottom: 4,
    },
    loadingText: {
      marginLeft: 8,
      fontSize: 14,
      color: theme.secondary,
    },
    inputContainer: {
      flexDirection: 'row',
      padding: 12,
      backgroundColor: theme.inputBackground,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#333333' : '#E0E0E0',
      alignItems: 'center',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: BOTTOM_SAFE_AREA,
    },
    input: {
      flex: 1,
      borderRadius: 20,
      padding: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: theme.text,
      backgroundColor: isDarkMode ? 'transparent' : '#F5F5F7',
      maxHeight: 100,
      marginRight: 8,
    },
    sidebar: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      backgroundColor: theme.sidebarBackground,
      zIndex: 100,
      elevation: 5,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      display: 'flex',
      flexDirection: 'column',
      // Add padding for status bar at the top
      paddingTop: STATUS_BAR_HEIGHT,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.overlayColor,
      zIndex: 99,
    },
    sidebarTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    sidebarCloseButton: {
      fontSize: 20,
      color: theme.secondary,
      padding: 4,
    },
    newChatButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      padding: 12,
      margin: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.accent,
    },
    newChatText: {
      fontSize: 16,
      color: theme.accent,
      fontWeight: '500',
    },
    chatHistoryItem: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? 'transparent' : '#E0E0E0',
    },
    chatHistoryTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    chatHistoryDate: {
      fontSize: 12,
      color: theme.secondary,
      marginTop: 4,
    },
    profileName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    profileEmail: {
      fontSize: 12,
      color: theme.secondary,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Set StatusBar based on theme */}
      <StatusBar barStyle={theme.statusBarStyle} translucent backgroundColor="transparent" />
      
      {/* Use regular View instead of SafeAreaView with edges */}
      <View style={styles.safeAreaBottom}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          {/* Header with centered title - Add paddingTop for status bar */}
          <View style={dynamicStyles.header}>
            <TouchableOpacity 
              style={styles.menuButton} 
              onPress={toggleSidebar}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={dynamicStyles.menuIcon}>☰</Text>
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={dynamicStyles.headerTitle}>AdvisorAI</Text>
              <Text style={dynamicStyles.headerSubtitle}>Your College Companion</Text>
            </View>
            
            {/* Add an empty View with the same width as the menu button for balance */}
            <View style={styles.menuButton} />
          </View>

          <View style={styles.contentContainer}>
            {/* Chat messages */}
            <ScrollView
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageBubble,
                    message.sender === 'user' ? dynamicStyles.userBubble : dynamicStyles.aiBubble,
                  ]}
                >
                  {message.sender === 'ai' ? (
                    // AI message with icon
                    <>
                      <View style={styles.aiIconContainer}>
                        <Text style={styles.aiIcon}>🤖</Text>
                      </View>
                      <View style={styles.messageTextContainer}>
                        <Text style={dynamicStyles.messageText}>{message.text}</Text>
                        <Text style={dynamicStyles.timestamp}>{formatTime(message.timestamp)}</Text>
                      </View>
                    </>
                  ) : (
                    // User message without the flex container - Now using userMessageText style
                    <>
                      <Text style={dynamicStyles.userMessageText}>{message.text}</Text>
                      <Text style={dynamicStyles.userTimestamp}>{formatTime(message.timestamp)}</Text>
                    </>
                  )}
                </View>
              ))}
              {isLoading && (
                <View style={[styles.messageBubble, dynamicStyles.aiBubble]}>
                  <View style={styles.aiIconContainer}>
                    <Text style={styles.aiIcon}>🤖</Text>
                  </View>
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.secondary} />
                    <Text style={dynamicStyles.loadingText}>Thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Category quick access - POSITIONED ABSOLUTELY OVER MESSAGES */}
            <Animated.View 
              style={[
                styles.categoriesContainerAbsolute,
                { 
                  opacity: categoriesOpacity,
                  height: categoriesHeight,
                }
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContent}
              >
                {categories.map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={dynamicStyles.categoryButton}
                    onPress={() => getCategoryResponse(cat.name)}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={dynamicStyles.categoryText}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          </View>

          {/* Input field */}
          <View style={dynamicStyles.inputContainer}>
            <TextInput
              style={dynamicStyles.input}
              value={inputText}
              onChangeText={handleTextInputChange}
              placeholder="Ask AdvisorAI anything..."
              placeholderTextColor={isDarkMode ? "#999999" : "#888888"}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                inputText.trim() ? styles.sendButtonActive : null,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
          </View>

          {/* Sidebar overlay */}
          {isSidebarOpen && (
            <TouchableOpacity 
              style={[dynamicStyles.overlay, { opacity: overlayOpacity }]} 
              activeOpacity={1}
              onPress={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <Animated.View 
            style={[
              dynamicStyles.sidebar,
              { 
                width: sidebarWidth,
                transform: [{ translateX: sidebarTranslateX }] 
              }
            ]}
          >
            <View style={styles.sidebarHeader}>
              <Text style={dynamicStyles.sidebarTitle}>Chat History</Text>
              <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
                <Text style={dynamicStyles.sidebarCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={dynamicStyles.newChatButton}
              onPress={startNewChat}
            >
              <Text style={styles.newChatIcon}>+</Text>
              <Text style={dynamicStyles.newChatText}>Start New Chat</Text>
            </TouchableOpacity>
            
            <ScrollView style={styles.chatHistoryList}>
              {chatSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    dynamicStyles.chatHistoryItem,
                    currentChatId === session.id && styles.activeChatItem
                  ]}
                  onPress={() => loadChatSession(session.id)}
                >
                  <Text style={dynamicStyles.chatHistoryTitle}>{session.title}</Text>
                  <Text style={dynamicStyles.chatHistoryDate}>{formatDate(session.date)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Profile button at bottom of sidebar */}
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={openProfileScreen}
            >
              <View style={styles.profileButtonContent}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {userProfile.name.split(' ').map(name => name[0]).join('')}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={dynamicStyles.profileName}>{userProfile.name}</Text>
                  <Text style={dynamicStyles.profileEmail}>{userProfile.email}</Text>
                </View>
              </View>
              <Text style={styles.profileEditIcon}>⚙️</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

// Static styles that don't change with theme
const styles = StyleSheet.create({
  // ... All your static styles remain the same
  safeAreaBottom: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  menuButton: {
    padding: 8,
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Adjust top position to include status bar height
    paddingTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT + 16 : STATUS_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  categoriesContainerAbsolute: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  categoriesContent: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingTop: 20, // Add padding to accommodate categories at top
    paddingBottom: 400,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  aiIconContainer: {
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  aiIcon: {
    fontSize: 18,
  },
  messageTextContainer: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 8,
  },
  sendButton: {
    backgroundColor: '#B17777',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#C3423F',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  newChatIcon: {
    fontSize: 18,
    color: '#D88483',
    marginRight: 8,
  },
  chatHistoryList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  activeChatItem: {
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    margin: 16,
    marginTop: 0,
  },
  profileButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileEditIcon: {
    fontSize: 18,
  },
});

// Main App component with ThemeProvider
const App = () => {
  return (
    <ThemeProvider>
      <AdvisorAI />
    </ThemeProvider>
  );
};

export default App;