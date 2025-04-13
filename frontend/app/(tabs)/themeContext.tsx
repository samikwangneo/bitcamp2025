import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

// Theme colors definition
export type ThemeColors = {
  background: string;
  headerBackground: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  inputBackground: string;
  sidebarBackground: string;
  userBubble: string;
  aiBubble: string;
  statusBarStyle: 'light-content' | 'dark-content';
  overlayColor: string;
  shadowColor: string;
};

// Default dark theme
export const darkTheme: ThemeColors = {
  background: '#000000',
  headerBackground: '#000000',
  surface: '#1E1E1F',
  primary: '#C3423F',
  secondary: '#A1B5D8',
  accent: '#D88483',
  text: '#FFFFFF',
  textSecondary: '#E2E8F0',
  inputBackground: '#1E1E1F',
  sidebarBackground: '#1E1E1F',
  userBubble: '#C3423F',
  aiBubble: '#1E1E1F',
  statusBarStyle: 'light-content',
  overlayColor: '#000000',
  shadowColor: '#000000',
};

// Light theme
export const lightTheme: ThemeColors = {
  background: '#F5F5F7',
  headerBackground: '#FFFFFF',
  surface: '#FFFFFF',
  primary: '#C3423F',
  secondary: '#6D7F99',
  accent: '#D88483',
  text: '#333333',
  textSecondary: '#4A5568',
  inputBackground: '#FFFFFF',
  sidebarBackground: '#FFFFFF',
  userBubble: '#C3423F',
  aiBubble: '#EFEFEF',
  statusBarStyle: 'dark-content',
  overlayColor: '#000000',
  shadowColor: '#000000',
};

// Theme context type
export type ThemeContextType = {
  themeMode: 'light' | 'dark' | 'auto';
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
  theme: ThemeColors;
};

// Create theme context with default values
export const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'auto',
  setThemeMode: () => {},
  theme: darkTheme,
});

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto');

  // Determine the effective theme based on themeMode and system color scheme
  const theme = themeMode === 'auto'
    ? (systemColorScheme === 'dark' ? darkTheme : lightTheme)
    : (themeMode === 'dark' ? darkTheme : lightTheme);

  // Update theme when system color scheme changes (only in auto mode)
  useEffect(() => {
    if (themeMode === 'auto') {
      // Theme will automatically update due to systemColorScheme change
    }
  }, [systemColorScheme, themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme
export const useTheme = () => useContext(ThemeContext);