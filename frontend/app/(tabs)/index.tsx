import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Alert,
} from 'react-native';
import ProfileScreen from './profile';
import { ThemeProvider, useTheme } from './themeContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
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
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "John Doe",
    email: "john.doe@university.edu",
    major: "Computer Science",
    year: "Junior",
    preferences: {
      notifications: true,
      darkMode: true,
    },
  });

  const { isDarkMode, toggleTheme, theme } = useTheme();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
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

  const sidebarAnimation = useRef(new Animated.Value(0)).current;
  const categoriesAnimation = useRef(new Animated.Value(1)).current;

  const CHAT_SESSIONS_KEY = '@AdvisorAI:chatSessions';
  const USER_PROFILE_KEY = '@AdvisorAI:userProfile';

  useEffect(() => {
    const loadData = async () => {
      try {
        const profileJson = await AsyncStorage.getItem(USER_PROFILE_KEY);
        if (profileJson) {
          const parsedProfile = JSON.parse(profileJson);
          parsedProfile.preferences.darkMode = parsedProfile.preferences.darkMode ?? true;
          setUserProfile(parsedProfile);
          console.log('Loaded user profile:', parsedProfile);
        } else {
          console.log('No user profile found in AsyncStorage');
        }

        const sessionsJson = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
        if (sessionsJson) {
          const parsedSessions = JSON.parse(sessionsJson).map((session: ChatSession) => ({
            ...session,
            date: new Date(session.date),
            messages: session.messages.map((msg: Message) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          }));
          console.log('Loaded chat sessions from AsyncStorage:', parsedSessions);
          setChatSessions(parsedSessions);
        } else {
          console.log('No chat sessions found in AsyncStorage');
        }
      } catch (error) {
        console.error('Error loading data from AsyncStorage:', error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const saveProfile = async () => {
      try {
        await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
      } catch (error) {
        console.error('Error saving profile to AsyncStorage:', error);
      }
    };

    saveProfile();
  }, [userProfile]);

  useEffect(() => {
    if (isDarkMode !== userProfile.preferences.darkMode) {
      toggleTheme();
    }
  }, [userProfile.preferences.darkMode, isDarkMode, toggleTheme]);

  useEffect(() => {
    const saveChatSessions = async () => {
      try {
        console.log('Attempting to save chat sessions:', chatSessions);
        await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(chatSessions));
        console.log('Successfully saved chat sessions to AsyncStorage');
      } catch (error) {
        console.error('Error saving chat sessions to AsyncStorage:', error);
      }
    };

    if (chatSessions.length > 0) {
      saveChatSessions();
    } else {
      console.log('No chat sessions to save');
    }
  }, [chatSessions]);

  const hasUserMessages = messages.some(message => message.sender === 'user');
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

  const sidebarWidth = SCREEN_WIDTH * 0.75;

  const sidebarTranslateX = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-sidebarWidth, 0],
  });

  const overlayOpacity = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0],
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
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages, userMessage, aiMessage];
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title: `Chat about ${category}`,
          date: new Date(),
          messages: newMessages,
        };
        setChatSessions((prev) => {
          const updatedSessions = [...prev, newSession];
          console.log('Updated chatSessions after category:', updatedSessions);
          return updatedSessions;
        });
        setCurrentChatId(newSession.id);
        return newMessages;
      });
      setIsLoading(false);
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    Keyboard.dismiss();

    const userMessage: Message = {
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages, userMessage];
      if (!currentChatId) {
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title: inputText.slice(0, 20) + (inputText.length > 20 ? '...' : ''),
          date: new Date(),
          messages: newMessages,
        };
        setChatSessions((prev) => {
          const updatedSessions = [...prev, newSession];
          console.log('Created new chat session:', updatedSessions);
          return updatedSessions;
        });
        setCurrentChatId(newSession.id);
      } else {
        setChatSessions((prev) => {
          const updatedSessions = prev.map((session) =>
            session.id === currentChatId
              ? { ...session, messages: newMessages }
              : session
          );
          console.log('Updated existing chat session:', updatedSessions);
          return updatedSessions;
        });
      }
      return newMessages;
    });
    setInputText('');
    setIsTyping(false);
    setIsLoading(true);
    setTimeout(() => {
      const aiMessage: Message = {
        text: `You asked: "${inputText}". I'm processing your request. For now, try asking about courses, minors, or deadlines!`,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages, aiMessage];
        setChatSessions((prev) => {
          const updatedSessions = prev.map((session) =>
            session.id === currentChatId
              ? { ...session, messages: newMessages }
              : session
          );
          console.log('Updated chat session with AI response:', updatedSessions);
          return updatedSessions;
        });
        return newMessages;
      });
      setIsLoading(false);
    }, 1000);
  };

  const deleteChatSession = async (sessionId: string) => {
    try {
      const updatedSessions = chatSessions.filter((session) => session.id !== sessionId);
      setChatSessions(updatedSessions);

      await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updatedSessions));

      if (currentChatId === sessionId) {
        setMessages([
          {
            text: "Hello! I'm AdvisorAI, your personal college advisor. I can help you with information about courses, minors, ULCs, CS tracks, and more. How can I assist you today?",
            sender: 'ai',
            timestamp: new Date(),
          },
        ]);
        setCurrentChatId(null);
      }

      console.log(`Deleted chat session ${sessionId}`);
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  };

  const handleLongPress = (sessionId: string, sessionTitle: string) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete "${sessionTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteChatSession(sessionId),
        },
      ],
      { cancelable: true }
    );
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
    const session = chatSessions.find((s) => s.id === sessionId);
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
    Keyboard.dismiss();
    setIsSidebarOpen(!isSidebarOpen);
  };

  const openProfileScreen = () => {
    setIsSidebarOpen(false);
    setShowProfileScreen(true);
  };

  if (showProfileScreen) {
    return (
      <ProfileScreen
        profile={userProfile}
        setProfile={setUserProfile}
        onBack={() => setShowProfileScreen(false)}
      />
    );
  }

  const dynamicStyles = StyleSheet.create({
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
    userMessageText: {
      fontSize: 16,
      lineHeight: 22,
      color: '#FFFFFF',
    },
    timestamp: {
      fontSize: 12,
      color: theme.secondary,
      alignSelf: 'flex-end',
      marginTop: 4,
    },
    userTimestamp: {
      fontSize: 12,
      color: '#FFFFFF',
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
      paddingTop: STATUS_BAR_HEIGHT,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
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
      <StatusBar barStyle={theme.statusBarStyle} translucent backgroundColor="transparent" />
      <View style={styles.safeAreaBottom}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
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
            <View style={styles.menuButton} />
          </View>

          <View style={styles.contentContainer}>
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

            <Animated.View
              style={[
                styles.categoriesContainerAbsolute,
                {
                  opacity: categoriesOpacity,
                  height: categoriesHeight,
                },
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

          {isSidebarOpen && (
            <TouchableOpacity
              style={[dynamicStyles.overlay, { opacity: overlayOpacity }]}
              activeOpacity={1}
              onPress={() => setIsSidebarOpen(false)}
            />
          )}

          <Animated.View
            style={[
              dynamicStyles.sidebar,
              {
                width: sidebarWidth,
                transform: [{ translateX: sidebarTranslateX }],
              },
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
                    currentChatId === session.id && styles.activeChatItem,
                  ]}
                  onPress={() => loadChatSession(session.id)}
                  onLongPress={() => handleLongPress(session.id, session.title)}
                >
                  <Text style={dynamicStyles.chatHistoryTitle}>{session.title}</Text>
                  <Text style={dynamicStyles.chatHistoryDate}>{formatDate(session.date)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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

const styles = StyleSheet.create({
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
    paddingTop: 20,
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

const App = () => {
  return (
    <ThemeProvider>
      <AdvisorAI />
    </ThemeProvider>
  );
};

export default App;