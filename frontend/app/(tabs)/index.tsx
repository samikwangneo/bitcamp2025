import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
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
  Image,
} from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Profile component
const ProfileScreen = ({ 
  profile, 
  setProfile, 
  onBack 
}: { 
  profile: UserProfile, 
  setProfile: (profile: UserProfile) => void, 
  onBack: () => void 
}) => {
  const [editedProfile, setEditedProfile] = useState<UserProfile>({...profile});

  const saveProfile = () => {
    setProfile(editedProfile);
    onBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
      </View>

      <ScrollView style={styles.profileContainer}>
        <View style={styles.profileImageContainer}>
          <View style={styles.profileImage}>
            <Text style={styles.profileImagePlaceholder}>
              {profile.name.split(' ').map(name => name[0]).join('')}
            </Text>
          </View>
          <TouchableOpacity style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.profileInput}
            value={editedProfile.name}
            onChangeText={(text) => setEditedProfile({...editedProfile, name: text})}
            placeholder="Your Name"
            placeholderTextColor="#A1B5D8"
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.profileInput}
            value={editedProfile.email}
            onChangeText={(text) => setEditedProfile({...editedProfile, email: text})}
            placeholder="your.email@example.com"
            placeholderTextColor="#A1B5D8"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Major</Text>
          <TextInput
            style={styles.profileInput}
            value={editedProfile.major}
            onChangeText={(text) => setEditedProfile({...editedProfile, major: text})}
            placeholder="Your Major"
            placeholderTextColor="#A1B5D8"
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Year</Text>
          <TextInput
            style={styles.profileInput}
            value={editedProfile.year}
            onChangeText={(text) => setEditedProfile({...editedProfile, year: text})}
            placeholder="Freshman, Sophomore, Junior, Senior"
            placeholderTextColor="#A1B5D8"
          />
        </View>

        <View style={styles.preferenceSection}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Push Notifications</Text>
            <TouchableOpacity 
              style={[
                styles.toggleButton, 
                editedProfile.preferences.notifications ? styles.toggleActive : {}
              ]}
              onPress={() => setEditedProfile({
                ...editedProfile, 
                preferences: {
                  ...editedProfile.preferences,
                  notifications: !editedProfile.preferences.notifications
                }
              })}
            >
              <View style={[
                styles.toggleCircle, 
                editedProfile.preferences.notifications ? styles.toggleCircleActive : {}
              ]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Dark Mode</Text>
            <TouchableOpacity 
              style={[
                styles.toggleButton, 
                editedProfile.preferences.darkMode ? styles.toggleActive : {}
              ]}
              onPress={() => setEditedProfile({
                ...editedProfile, 
                preferences: {
                  ...editedProfile.preferences,
                  darkMode: !editedProfile.preferences.darkMode
                }
              })}
            >
              <View style={[
                styles.toggleCircle, 
                editedProfile.preferences.darkMode ? styles.toggleCircleActive : {}
              ]} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveProfile}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
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
  
  // Animation value for sidebar
  const sidebarAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: isSidebarOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSidebarOpen]);

  const sidebarWidth = SCREEN_WIDTH * 0.75;
  
  const sidebarTranslateX = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-sidebarWidth, 0],
  });

  const overlayOpacity = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
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
    const userMessage: Message = {
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputText('');
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>AdvisorAI</Text>
            <Text style={styles.headerSubtitle}>Your College Companion</Text>
          </View>
        </View>

        {/* Category quick access */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          {categories.map((cat, index) => (
            <TouchableOpacity
              key={index}
              style={styles.categoryButton}
              onPress={() => getCategoryResponse(cat.name)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
                message.sender === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              {message.sender === 'ai' && (
                <View style={styles.aiIconContainer}>
                  <Text style={styles.aiIcon}>🤖</Text>
                </View>
              )}
              <View style={styles.messageTextContainer}>
                <Text style={styles.messageText}>{message.text}</Text>
                <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
              </View>
            </View>
          ))}
          {isLoading && (
            <View style={[styles.messageBubble, styles.aiBubble]}>
              <View style={styles.aiIconContainer}>
                <Text style={styles.aiIcon}>🤖</Text>
              </View>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#A1B5D8" />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input field */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask AdvisorAI anything..."
            placeholderTextColor="#A1B5D8"
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
            style={[styles.overlay, { opacity: overlayOpacity }]} 
            activeOpacity={1}
            onPress={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Animated.View 
          style={[
            styles.sidebar,
            { 
              width: sidebarWidth,
              transform: [{ translateX: sidebarTranslateX }] 
            }
          ]}
        >
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Chat History</Text>
            <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
              <Text style={styles.sidebarCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.newChatButton}
            onPress={startNewChat}
          >
            <Text style={styles.newChatIcon}>+</Text>
            <Text style={styles.newChatText}>Start New Chat</Text>
          </TouchableOpacity>
          
          <ScrollView style={styles.chatHistoryList}>
            {chatSessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={[
                  styles.chatHistoryItem,
                  currentChatId === session.id && styles.activeChatItem
                ]}
                onPress={() => loadChatSession(session.id)}
              >
                <Text style={styles.chatHistoryTitle}>{session.title}</Text>
                <Text style={styles.chatHistoryDate}>{formatDate(session.date)}</Text>
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
                <Text style={styles.profileName}>{userProfile.name}</Text>
                <Text style={styles.profileEmail}>{userProfile.email}</Text>
              </View>
            </View>
            <Text style={styles.profileEditIcon}>⚙️</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1E293B',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  menuButton: {
    padding: 8,
    marginRight: 16,
  },
  menuIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  backIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#F2EFE9',
    marginTop: 4,
  },
  categoriesContainer: {
    height: SCREEN_HEIGHT * 0.1, // Set to 10% of screen height
    paddingHorizontal: 8,
    paddingVertical: 10,
    flex: 0,
    backgroundColor: '#1E293B',
  },
  categoryButton: {
    height: SCREEN_HEIGHT * 0.1 - 16, // Fit within container height
    padding: 8,
    marginHorizontal: 8,
    backgroundColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#475569',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  messagesContainer: {
    flex: 0,
    height: SCREEN_HEIGHT * .55,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingTop: 16,
    paddingBottom: 16,
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
  userBubble: {
    backgroundColor: '#3B82F6',
    alignSelf: 'flex-end',
    marginLeft: 50,
  },
  aiBubble: {
    backgroundColor: '#1E293B',
    alignSelf: 'flex-start',
    marginRight: 50,
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
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#E2E8F0',
  },
  timestamp: {
    fontSize: 12,
    color: '#A1B5D8',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#A1B5D8',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#475569',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 20,
    padding: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#64748B',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#3B82F6',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#1E293B',
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    display: 'flex',
    flexDirection: 'column',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 99,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#475569',
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sidebarCloseButton: {
    fontSize: 20,
    color: '#A1B5D8',
    padding: 4,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    padding: 12,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  newChatIcon: {
    fontSize: 18,
    color: '#3B82F6',
    marginRight: 8,
  },
  newChatText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  chatHistoryList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatHistoryItem: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#475569',
  },
  activeChatItem: {
    borderColor: '#3B82F6',
  },
  chatHistoryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  chatHistoryDate: {
    fontSize: 12,
    color: '#A1B5D8',
    marginTop: 4,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#334155',
    padding: 12,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
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
  profileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  profileEmail: {
    fontSize: 12,
    color: '#A1B5D8',
  },
  profileEditIcon: {
    fontSize: 18,
  },
  // Profile screen styles
  profileContainer: {
    flex: 1,
    padding: 16,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileImagePlaceholder: {
    fontSize: 36,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  changePhotoButton: {
    padding: 8,
  },
  changePhotoText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#A1B5D8',
    marginBottom: 8,
  },
  profileInput: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#475569',
  },
  preferenceSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#475569',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#3B82F6',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AdvisorAI;