import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Platform,
  StatusBar,
} from 'react-native';
import { useTheme } from './themeContext';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

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

type ProfileScreenProps = {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  onBack: () => void;
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ profile, setProfile, onBack }) => {
  const { isDarkMode, toggleTheme, theme } = useTheme();
  const [editedProfile, setEditedProfile] = useState<UserProfile>({ ...profile });

  const handleSave = () => {
    // Save all fields except darkMode, which is already saved on toggle
    setProfile({
      ...editedProfile,
      preferences: {
        ...editedProfile.preferences,
        darkMode: profile.preferences.darkMode, // Preserve the current darkMode
      },
    });
    onBack();
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePreferenceChange = (preference: keyof UserProfile['preferences'], value: boolean) => {
    setEditedProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value,
      },
    }));

    if (preference === 'darkMode') {
      toggleTheme();
      // Immediately update parent profile to save to AsyncStorage
      setProfile({
        ...profile,
        preferences: {
          ...profile.preferences,
          darkMode: value,
        },
      });
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: Platform.OS === 'android' ? STATUS_BAR_HEIGHT + 16 : STATUS_BAR_HEIGHT + 16,
      backgroundColor: theme.headerBackground,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333333' : '#E0E0E0',
    },
    backButton: {
      paddingRight: 16,
    },
    backButtonText: {
      fontSize: 18,
      color: theme.accent,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    section: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 24,
      padding: 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      marginBottom: 8,
      color: theme.textSecondary,
    },
    input: {
      backgroundColor: isDarkMode ? '#333333' : '#F5F5F7',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.text,
    },
    preferencesItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333333' : '#E0E0E0',
    },
    preferencesLabel: {
      fontSize: 16,
      color: theme.text,
    },
    saveButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginHorizontal: 16,
      marginBottom: 24,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle={theme.statusBarStyle} translucent backgroundColor="transparent" />
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={dynamicStyles.backButton} onPress={onBack}>
          <Text style={dynamicStyles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Edit Profile</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Personal Information</Text>
            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.inputLabel}>Name</Text>
              <TextInput
                style={dynamicStyles.input}
                value={editedProfile.name}
                onChangeText={(text) => handleInputChange('name', text)}
                placeholder="Your name"
                placeholderTextColor={isDarkMode ? '#999999' : '#888888'}
              />
            </View>
            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.inputLabel}>Email</Text>
              <TextInput
                style={dynamicStyles.input}
                value={editedProfile.email}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholder="Your email"
                placeholderTextColor={isDarkMode ? '#999999' : '#888888'}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>Academic Information</Text>
            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.inputLabel}>Major</Text>
              <TextInput
                style={dynamicStyles.input}
                value={editedProfile.major}
                onChangeText={(text) => handleInputChange('major', text)}
                placeholder="Your major"
                placeholderTextColor={isDarkMode ? '#999999' : '#888888'}
              />
            </View>
            <View style={dynamicStyles.inputContainer}>
              <Text style={dynamicStyles.inputLabel}>Year</Text>
              <TextInput
                style={dynamicStyles.input}
                value={editedProfile.year}
                onChangeText={(text) => handleInputChange('year', text)}
                placeholder="Your year"
                placeholderTextColor={isDarkMode ? '#999999' : '#888888'}
              />
            </View>
          </View>
          <View style={dynamicStyles.section}>
            <Text style={dynamicStyles.sectionTitle}>App Preferences</Text>
            <View style={dynamicStyles.preferencesItem}>
              <Text style={dynamicStyles.preferencesLabel}>Enable Notifications</Text>
              <Switch
                value={editedProfile.preferences.notifications}
                onValueChange={(value) => handlePreferenceChange('notifications', value)}
                trackColor={{ false: '#767577', true: theme.accent }}
                thumbColor={editedProfile.preferences.notifications ? theme.primary : '#f4f3f4'}
              />
            </View>
            <View style={[dynamicStyles.preferencesItem, styles.lastPreferenceItem]}>
              <Text style={dynamicStyles.preferencesLabel}>Dark Mode</Text>
              <Switch
                value={editedProfile.preferences.darkMode}
                onValueChange={(value) => handlePreferenceChange('darkMode', value)}
                trackColor={{ false: '#767577', true: theme.accent }}
                thumbColor={editedProfile.preferences.darkMode ? theme.primary : '#f4f3f4'}
              />
            </View>
          </View>
          <TouchableOpacity style={dynamicStyles.saveButton} onPress={handleSave}>
            <Text style={dynamicStyles.saveButtonText}>Save Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  lastPreferenceItem: {
    borderBottomWidth: 0,
  },
});

export default ProfileScreen;