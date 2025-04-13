import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import ProfileScreen from "./profile";
import { ThemeProvider, useTheme } from "./themeContext";
import { EmailHandler } from "../../components/EmailHandler";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const STATUS_BAR_HEIGHT =
  Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24;
const BOTTOM_SAFE_AREA = Platform.OS === "ios" ? 34 : 0;

type Message = {
  text: string;
  sender: "user" | "ai";
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

const ADK_API_URL = "https://7a27-206-139-64-98.ngrok-free.app/run";
const ADK_BASE_URL = "https://7a27-206-139-64-98.ngrok-free.app";
const ADK_APP_NAME = "cs_advisor";

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
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [showProfileScreen, setShowProfileScreen] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  const sidebarAnimation = useRef(new Animated.Value(0)).current;
  const categoriesAnimation = useRef(new Animated.Value(1)).current;

  const CHAT_SESSIONS_KEY = "@AdvisorAI:chatSessions";
  const USER_PROFILE_KEY = "@AdvisorAI:userProfile";
  const USER_ID_KEY = "@AdvisorAI:userId";

  useEffect(() => {
    const loadData = async () => {
      try {
        let storedUserId = await AsyncStorage.getItem(USER_ID_KEY);
        if (!storedUserId) {
          storedUserId = uuidv4();
          if (storedUserId) {
            await AsyncStorage.setItem(USER_ID_KEY, storedUserId);
            console.log("Generated and stored new userId:", storedUserId);
          } else {
            console.error("Failed to generate userId");
            Alert.alert(
              "Initialization Error",
              "Could not create a user identifier. Please restart the app."
            );
            return;
          }
        }
        setUserId(storedUserId);

        const profileJson = await AsyncStorage.getItem(USER_PROFILE_KEY);
        if (profileJson) {
          const parsedProfile = JSON.parse(profileJson);
          parsedProfile.preferences.darkMode =
            parsedProfile.preferences.darkMode ?? true;
          setUserProfile(parsedProfile);
          console.log("Loaded user profile:", parsedProfile);
        } else {
          console.log("No user profile found in AsyncStorage");
        }

        const sessionsJson = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
        if (sessionsJson) {
          const parsedSessions = JSON.parse(sessionsJson).map(
            (session: ChatSession) => ({
              ...session,
              date: new Date(session.date),
              messages: session.messages.map((msg: Message) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              })),
            })
          );
          console.log(
            "Loaded chat sessions from AsyncStorage:",
            parsedSessions
          );
          setChatSessions(parsedSessions);
        } else {
          console.log("No chat sessions found in AsyncStorage");
        }
      } catch (error) {
        console.error("Error loading data from AsyncStorage:", error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const saveProfile = async () => {
      try {
        await AsyncStorage.setItem(
          USER_PROFILE_KEY,
          JSON.stringify(userProfile)
        );
      } catch (error) {
        console.error("Error saving profile to AsyncStorage:", error);
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
        console.log("Attempting to save chat sessions:", chatSessions);
        await AsyncStorage.setItem(
          CHAT_SESSIONS_KEY,
          JSON.stringify(chatSessions)
        );
        console.log("Successfully saved chat sessions to AsyncStorage");
      } catch (error) {
        console.error("Error saving chat sessions to AsyncStorage:", error);
      }
    };

    if (chatSessions.length > 0) {
      saveChatSessions();
    } else {
      console.log("No chat sessions to save");
    }
  }, [chatSessions]);

  const hasUserMessages = messages.some((message) => message.sender === "user");
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
    { name: "Courses", icon: "📚" },
    { name: "Minors", icon: "🎓" },
    { name: "ULCs", icon: "📝" },
    { name: "CS Tracks", icon: "💻" },
    { name: "Deadlines", icon: "📅" },
  ];

  const createAdkSession = async (
    userId: string,
    sessionId: string
  ): Promise<boolean> => {
    if (!userId || !sessionId) {
      console.error("User ID or Session ID missing, cannot create session");
      return false;
    }

    const sessionUrl = `${ADK_BASE_URL}/apps/${ADK_APP_NAME}/users/${userId}/sessions/${sessionId}`;

    try {
      console.log("Pre-registering ADK session at:", sessionUrl);
      const response = await fetch(sessionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}),
      });

      console.log("Create Session API Response Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Create Session API Error Response Text:", errorText);
        if (
          response.status === 400 &&
          errorText.toLowerCase().includes("session already exists")
        ) {
          console.warn(
            `Session ${sessionId} already exists on the server. Proceeding...`
          );
          return true;
        }
        Alert.alert(
          "API Error",
          `Failed to create/register chat session: ${response.status} - ${errorText}`
        );
        return false;
      }

      const responseData = await response.json();
      console.log(
        "Create Session API Response Data:",
        JSON.stringify(responseData, null, 2)
      );

      if (!responseData || responseData.id !== sessionId) {
        console.warn(
          "Session creation response did not match expected ID. Response:",
          responseData
        );
      }

      return true;
    } catch (error: any) {
      console.error("Error creating ADK session:", error);
      if (error.message?.toLowerCase().includes("network request failed")) {
        Alert.alert(
          "Network Error",
          "Could not connect to the AdvisorAI backend to create a session. Please ensure the backend server is running and reachable."
        );
      } else {
        Alert.alert(
          "Error",
          `An error occurred while creating a chat session: ${error.message}`
        );
      }
      return false;
    }
  };

  const sendMessageToAdk = async (
    userId: string,
    sessionId: string,
    textInput: string
  ): Promise<string | null> => {
    if (!userId || !sessionId) {
      console.error("User ID or Session ID missing, cannot send message");
      return null;
    }

    const requestBody = {
      app_name: ADK_APP_NAME,
      user_id: userId,
      session_id: sessionId,
      new_message: {
        role: "user",
        parts: [{ text: textInput }],
      },
    };

    try {
      console.log("Sending message to ADK API:", requestBody);
      const response = await fetch(ADK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Send Message API Response Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Send Message API Error Response Text:", errorText);
        Alert.alert(
          "API Error",
          `Failed to send message: ${response.status} - ${errorText}`
        );
        return null;
      }

      const responseData = await response.json();
      console.log(
        "Send Message API Response Data:",
        JSON.stringify(responseData, null, 2)
      );

      let aiText: string | null = null;
      if (Array.isArray(responseData)) {
        console.log(`[DEBUG] Searching for event author: ${ADK_APP_NAME}`);
        const agentEvent = responseData.find((event, index) => {
          console.log(
            `[DEBUG] Checking event[${index}].author: ${event.author}`
          );
          const authorMatch = event.author === ADK_APP_NAME;
          const textExists = event.content?.parts?.[0]?.text;
          console.log(
            `[DEBUG] Event[${index}] - Author Match: ${authorMatch}, Text Exists: ${!!textExists}`
          );
          if (textExists) {
            console.log(
              `[DEBUG] Event[${index}] - Text Content: ${event.content.parts[0].text.substring(
                0,
                50
              )}...`
            );
          }
          return authorMatch && !!textExists;
        });
        console.log(
          "[DEBUG] Found agentEvent:",
          agentEvent ? JSON.stringify(agentEvent) : "null"
        );

        if (agentEvent) {
          aiText = agentEvent.content.parts[0].text;
        }
      }

      if (!aiText) {
        console.warn(
          "Could not extract AI text from response events:",
          responseData
        );
        return null;
      }

      console.log("[DEBUG] Final extracted aiText:", aiText);
      return aiText;
    } catch (error: any) {
      console.error("Error sending message to ADK API:", error);
      if (error.message?.toLowerCase().includes("network request failed")) {
        Alert.alert(
          "Network Error",
          "Could not connect to the AdvisorAI backend to send a message. Please ensure the backend server is running and reachable."
        );
      } else {
        Alert.alert(
          "Error",
          `An error occurred while sending a message: ${error.message}`
        );
      }
      return null;
    }
  };

  const getCategoryResponse = async (category: string) => {
    if (!userId) {
      Alert.alert("Error", "User not initialized. Cannot send message.");
      return;
    }

    const userText = `Tell me about ${category}`;
    setIsLoading(true);
    Keyboard.dismiss();

    // Add user's category query to messages
    const userMessage: Message = {
      text: userText,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    let effectiveSessionId = currentChatId;
    const isNewChat = !effectiveSessionId;

    // 1. Ensure session exists on the backend if it's a new chat
    if (isNewChat) {
      const newSessionId = uuidv4();
      console.log(
        `Starting new chat for category ${category}, attempting to create session: ${newSessionId}`
      );
      const created = await createAdkSession(userId, newSessionId);
      if (!created) {
        setIsLoading(false);
        const errorMessage: Message = {
          text: "Failed to start a new chat session with the backend. Please try again.",
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
        return;
      }
      effectiveSessionId = newSessionId;
      setCurrentChatId(newSessionId);
    }

    // Ensure we have a session ID
    if (!effectiveSessionId) {
      console.error(
        "Error: Session ID is null even after attempting creation."
      );
      setIsLoading(false);
      const errorMessage: Message = {
        text: "Internal error: Could not establish a valid chat session ID.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
      return;
    }

    // 2. Send the category query to the ADK API
    const aiResponse = await sendMessageToAdk(
      userId,
      effectiveSessionId,
      userText
    );

    // 3. Handle the API response
    if (aiResponse) {
      const aiMessage: Message = {
        text: aiResponse,
        sender: "ai",
        timestamp: new Date(),
      };
      const finalMessages = [...messages, userMessage, aiMessage];
      setMessages(finalMessages);

      // Update or create session history
      setChatSessions((prevSessions) => {
        const existingIndex = prevSessions.findIndex(
          (s) => s.id === effectiveSessionId
        );
        if (existingIndex > -1) {
          // Update existing session
          const updated = [...prevSessions];
          updated[existingIndex] = {
            ...updated[existingIndex],
            messages: finalMessages,
          };
          return updated;
        } else if (isNewChat) {
          // Add new session
          const newSession: ChatSession = {
            id: effectiveSessionId,
            title: `Chat about ${category}`,
            date: new Date(),
            messages: finalMessages,
          };
          return [...prevSessions, newSession];
        }
        console.error(
          "Session ID existed but wasn't found in history array for update."
        );
        return prevSessions;
      });
      setCurrentChatId(effectiveSessionId);
    } else {
      // Handle API failure
      const errorMessage: Message = {
        text: "Failed to receive a response from the backend. Please try again later.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !userId) {
      if (!userId)
        Alert.alert("Error", "User not initialized. Cannot send message.");
      return;
    }

    const userText = inputText;
    console.log("User input:", userText);
    Keyboard.dismiss();

    const userMessage: Message = {
      text: userText,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputText("");
    setIsTyping(false);
    setIsLoading(true);

    let effectiveSessionId = currentChatId;
    const isNewChat = !effectiveSessionId;

    if (isNewChat) {
      const newSessionId = uuidv4();
      console.log(
        `Starting new chat, attempting to create session: ${newSessionId}`
      );
      const created = await createAdkSession(userId, newSessionId);
      if (!created) {
        setIsLoading(false);
        const errorMessage: Message = {
          text: "Failed to start a new chat session with the backend. Please try again.",
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
        return;
      }
      effectiveSessionId = newSessionId;
      setCurrentChatId(newSessionId);
    }

    if (!effectiveSessionId) {
      console.error(
        "Error: Session ID is null even after attempting creation."
      );
      setIsLoading(false);
      const errorMessage: Message = {
        text: "Internal error: Could not establish a valid chat session ID.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
      return;
    }

    const aiResponse = await sendMessageToAdk(
      userId,
      effectiveSessionId,
      userText
    );

    if (aiResponse) {
      const aiMessage: Message = {
        text: aiResponse,
        sender: "ai",
        timestamp: new Date(),
      };
      const finalMessages = [...messages, userMessage, aiMessage];
      setMessages(finalMessages);

      setChatSessions((prevSessions) => {
        const existingIndex = prevSessions.findIndex(
          (s) => s.id === effectiveSessionId
        );
        if (existingIndex > -1) {
          const updated = [...prevSessions];
          updated[existingIndex] = {
            ...updated[existingIndex],
            messages: finalMessages,
          };
          return updated;
        } else if (isNewChat) {
          const newSession: ChatSession = {
            id: effectiveSessionId,
            title: userText.slice(0, 20) + (userText.length > 20 ? "..." : ""),
            date: new Date(),
            messages: finalMessages,
          };
          return [...prevSessions, newSession];
        } else {
          console.error(
            "Session ID existed but wasn't found in history array for update."
          );
          return prevSessions;
        }
      });
      setCurrentChatId(effectiveSessionId);
    } else {
      const errorMessage: Message = {
        text: "Failed to receive a response from the backend. Please try again later.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }

    setIsLoading(false);
  };

  const deleteChatSession = async (sessionId: string) => {
    try {
      const updatedSessions = chatSessions.filter(
        (session) => session.id !== sessionId
      );
      setChatSessions(updatedSessions);

      await AsyncStorage.setItem(
        CHAT_SESSIONS_KEY,
        JSON.stringify(updatedSessions)
      );

      if (currentChatId === sessionId) {
        setMessages([
          {
            text: "Hello! I'm AdvisorAI, your personal college advisor. I can help you with information about courses, minors, ULCs, CS tracks, and more. How can I assist you today?",
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
        setCurrentChatId(null);
      }

      console.log(`Deleted chat session ${sessionId}`);
    } catch (error) {
      console.error("Error deleting chat session:", error);
    }
  };

  const handleLongPress = (sessionId: string, sessionTitle: string) => {
    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete "${sessionTitle}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
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
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
        sender: "ai",
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
      position: "relative",
      backgroundColor: theme.headerBackground,
      paddingTop:
        Platform.OS === "android"
          ? STATUS_BAR_HEIGHT + 16
          : 16 + STATUS_BAR_HEIGHT,
    },
    menuIcon: {
      fontSize: 24,
      color: theme.text,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: "700",
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
      alignItems: "center",
      justifyContent: "center",
      minWidth: 80,
    },
    categoryText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    userBubble: {
      backgroundColor: theme.userBubble,
      alignSelf: "flex-end",
      marginLeft: 50,
      paddingRight: 42,
      paddingBottom: 20,
      minWidth: 70,
    },
    aiBubble: {
      backgroundColor: theme.aiBubble,
      alignSelf: "flex-start",
      marginRight: 50,
      maxWidth: "85%",
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
      color: theme.text,
    },
    userMessageText: {
      fontSize: 16,
      lineHeight: 22,
      color: "#FFFFFF",
    },
    timestamp: {
      fontSize: 12,
      color: theme.secondary,
      alignSelf: "flex-end",
      marginTop: 4,
    },
    userTimestamp: {
      fontSize: 12,
      color: "#FFFFFF",
      position: "absolute",
      right: 12,
      bottom: 4,
    },
    loadingText: {
      marginLeft: 8,
      fontSize: 14,
      color: theme.secondary,
    },
    inputContainer: {
      flexDirection: "row",
      padding: 12,
      backgroundColor: theme.inputBackground,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? "#333333" : "#E0E0E0",
      alignItems: "center",
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
      backgroundColor: isDarkMode ? "transparent" : "#F5F5F7",
      maxHeight: 100,
      marginRight: 8,
    },
    sidebar: {
      position: "absolute",
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
      display: "flex",
      flexDirection: "column",
      paddingTop: STATUS_BAR_HEIGHT,
    },
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "transparent",
      zIndex: 99,
    },
    sidebarTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.text,
    },
    sidebarCloseButton: {
      fontSize: 20,
      color: theme.secondary,
      padding: 4,
    },
    newChatButton: {
      flexDirection: "row",
      alignItems: "center",
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
      fontWeight: "500",
    },
    chatHistoryItem: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? "transparent" : "#E0E0E0",
    },
    chatHistoryTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.text,
    },
    chatHistoryDate: {
      fontSize: 12,
      color: theme.secondary,
      marginTop: 4,
    },
    profileName: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.text,
    },
    profileEmail: {
      fontSize: 12,
      color: theme.secondary,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <StatusBar
        barStyle={theme.statusBarStyle}
        translucent
        backgroundColor="transparent"
      />
      <View style={styles.safeAreaBottom}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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
              <Text style={dynamicStyles.headerSubtitle}>
                Your College Companion
              </Text>
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
                    message.sender === "user"
                      ? dynamicStyles.userBubble
                      : dynamicStyles.aiBubble,
                  ]}
                >
                  {message.sender === "ai" ? (
                    <>
                      <View style={styles.aiIconContainer}>
                        <Text style={styles.aiIcon}>🤖</Text>
                      </View>
                      <View style={styles.messageTextContainer}>
                        <EmailHandler text={message.text} />
                        <Text style={dynamicStyles.timestamp}>
                          {formatTime(message.timestamp)}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={dynamicStyles.userMessageText}>
                        {message.text}
                      </Text>
                      <Text style={dynamicStyles.userTimestamp}>
                        {formatTime(message.timestamp)}
                      </Text>
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
              {[...chatSessions]
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      dynamicStyles.chatHistoryItem,
                      currentChatId === session.id && styles.activeChatItem,
                    ]}
                    onPress={() => loadChatSession(session.id)}
                    onLongPress={() =>
                      handleLongPress(session.id, session.title)
                    }
                  >
                    <Text style={dynamicStyles.chatHistoryTitle}>
                      {session.title}
                    </Text>
                    <Text style={dynamicStyles.chatHistoryDate}>
                      {formatDate(session.date)}
                    </Text>
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
                    {userProfile.name
                      .split(" ")
                      .map((name) => name[0])
                      .join("")}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={dynamicStyles.profileName}>
                    {userProfile.name}
                  </Text>
                  <Text style={dynamicStyles.profileEmail}>
                    {userProfile.email}
                  </Text>
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
    alignItems: "flex-start",
  },
  headerTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingTop:
      Platform.OS === "android" ? STATUS_BAR_HEIGHT : STATUS_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    flex: 1,
    position: "relative",
  },
  categoriesContainerAbsolute: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  categoriesContent: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
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
    flexDirection: "row",
    marginBottom: 16,
    maxWidth: "85%",
    borderRadius: 20,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  aiIconContainer: {
    marginRight: 8,
    alignSelf: "flex-start",
  },
  aiIcon: {
    fontSize: 18,
  },
  messageTextContainer: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 8,
  },
  sendButton: {
    backgroundColor: "#B17777",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: "#C3423F",
  },
  sendButtonText: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  newChatIcon: {
    fontSize: 18,
    color: "#D88483",
    marginRight: 8,
  },
  chatHistoryList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  activeChatItem: {
    borderColor: "#3B82F6",
    borderWidth: 1,
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    margin: 16,
    marginTop: 0,
  },
  profileButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  profileAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
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
