import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { useTheme } from "/Users/eswarkaravadi/Bitcamp2025/bitcamp2025/frontend/app/(tabs)/themeContext";

interface EmailHandlerProps {
  text: string;
}

export const EmailHandler: React.FC<EmailHandlerProps> = ({ text }) => {
  const { theme } = useTheme(); // Move useTheme to top level of component

  // Static styles without theme dependencies
  const styles = StyleSheet.create({
    container: {
      width: "100%",
    },
    emailButton: {
      backgroundColor: "#4285F4",
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 6,
      marginVertical: 8,
      alignSelf: "flex-start",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    buttonText: {
      color: "white",
      fontWeight: "bold",
      fontSize: 16,
    },
  });

  // Dynamic styles that depend on theme
  const dynamicStyles = {
    messageText: {
      fontSize: 16,
      lineHeight: 22,
      color: theme.text, // Use theme.text dynamically
    },
  };

  // Extract email information from text content
  const parseContent = (content: string) => {
    // Helper to clean HTML from text
    const stripHtml = (html: string) => {
      const withoutTags = html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return withoutTags
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
    };

    // Function to extract and clean up an advisory message with button instruction
    const extractMessageWithButtonInstruction = (text: string) => {
      const phrases = [
        "Click the button below",
        "tap the button below",
        "click below",
        "use the button below",
        "contact academic advisor",
        "contact your advisor",
      ];
      let cleanedText = text.replace(/https?:\/\/[^\s]+/g, "");
      const buttonInstructionMatch = phrases.some((phrase) =>
        cleanedText.toLowerCase().includes(phrase.toLowerCase())
      );
      if (buttonInstructionMatch) {
        const paragraphs = cleanedText.split(/\n\n+/);
        const relevantParagraphs = paragraphs.filter((p) =>
          phrases.some((phrase) =>
            p.toLowerCase().includes(phrase.toLowerCase())
          )
        );
        if (relevantParagraphs.length > 0) {
          return relevantParagraphs.join("\n\n");
        }
      }
      return cleanedText;
    };

    if (
      content.includes('<a href="mailto:') ||
      content.includes('<a href="https://mail.google.com')
    ) {
      let emailAddress = "";
      let subject = "";
      let body = "";
      const mailtoMatch = content.match(/<a href="mailto:([^"]+)"[^>]*>/i);
      if (mailtoMatch && mailtoMatch[1]) {
        const mailtoUrl = mailtoMatch[1];
        const urlParts = mailtoUrl.split("?");
        emailAddress = urlParts[0];
        if (urlParts.length > 1) {
          const params = new URLSearchParams(urlParts[1]);
          subject = params.get("subject") || "";
          body = params.get("body") || "";
        }
      }
      if (!emailAddress) {
        const gmailMatch = content.match(
          /<a href="https:\/\/mail\.google\.com\/mail\/\?[^"]*to=([^"&]+)[^"]*"/i
        );
        if (gmailMatch && gmailMatch[1]) {
          emailAddress = decodeURIComponent(gmailMatch[1]);
          const subjectMatch =
            content.match(/su=([^"&]+)/i) || content.match(/subject=([^"&]+)/i);
          if (subjectMatch && subjectMatch[1]) {
            subject = decodeURIComponent(subjectMatch[1]);
          }
          const bodyMatch = content.match(/body=([^"&]+)/i);
          if (bodyMatch && bodyMatch[1]) {
            body = decodeURIComponent(bodyMatch[1]);
          }
        }
      }
      if (emailAddress) {
        const cleanText = stripHtml(content);
        const messageText = extractMessageWithButtonInstruction(cleanText);
        return (
          <View style={styles.container}>
            <Text style={dynamicStyles.messageText}>{messageText}</Text>
            <TouchableOpacity
              style={styles.emailButton}
              onPress={() => handleEmailPress(emailAddress, subject, body)}
            >
              <Text style={styles.buttonText}>Contact Academic Advisor</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }

    const gmailRegex = /https?:\/\/mail\.google\.com\/mail\/\?[^\s]*/g;
    const gmailUrls = content.match(gmailRegex);
    if (gmailUrls && gmailUrls.length > 0) {
      const gmailUrl = gmailUrls[0];
      const emailMatch = gmailUrl.match(/to=([^&]+)/);
      const subjectMatch =
        gmailUrl.match(/su=([^&]+)/) || gmailUrl.match(/subject=([^&]+)/);
      const bodyMatch = gmailUrl.match(/body=([^&]+)/);
      const emailAddress = emailMatch ? decodeURIComponent(emailMatch[1]) : "";
      const subject = subjectMatch ? decodeURIComponent(subjectMatch[1]) : "";
      const body = bodyMatch ? decodeURIComponent(bodyMatch[1]) : "";
      if (emailAddress) {
        const cleanText = content.replace(/https?:\/\/[^\s]+/g, "");
        const messageText = extractMessageWithButtonInstruction(cleanText);
        return (
          <View style={styles.container}>
            <Text style={dynamicStyles.messageText}>{messageText}</Text>
            <TouchableOpacity
              style={styles.emailButton}
              onPress={() => handleEmailPress(emailAddress, subject, body)}
            >
              <Text style={styles.buttonText}>Contact Academic Advisor</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }

    return <Text style={dynamicStyles.messageText}>{content}</Text>;
  };

  const handleEmailPress = async (
    email: string,
    subject: string = "",
    body: string = ""
  ) => {
    try {
      const mailtoUrl = `mailto:${email}?${
        subject ? `subject=${encodeURIComponent(subject)}` : ""
      }${subject && body ? "&" : ""}${
        body ? `body=${encodeURIComponent(body)}` : ""
      }`;
      console.log("Opening mail app with URL:", mailtoUrl);
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          "Email App Not Found",
          `Please send an email manually to:\n\n${email}\n\nSubject: ${subject}`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error opening email app:", error);
      Alert.alert("Error", "Could not open email application");
    }
  };

  return parseContent(text);
};