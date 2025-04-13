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

interface EmailHandlerProps {
  text: string;
}

export const EmailHandler: React.FC<EmailHandlerProps> = ({ text }) => {
  // Parse text to extract email information and clean display text
  const parseContent = (content: string) => {
    // Check for [EMAIL:address] token format
    const emailTokenRegex = /\[EMAIL:(.*?)\]/g;
    const emailMatch = content.match(emailTokenRegex);

    if (emailMatch) {
      // Extract email from first match
      const extractedEmail = emailMatch[0]
        .replace("[EMAIL:", "")
        .replace("]", "");

      // Clean display text by removing the token
      const displayText = content.replace(emailTokenRegex, "");

      return (
        <View>
          <Text style={styles.messageText}>{displayText.trim()}</Text>
          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => handleEmailPress(extractedEmail)}
          >
            <Text style={styles.buttonText}>Contact Academic Advisor</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Check for [MAILTO:email:subject:body] format
    const mailtoRegex = /\[MAILTO:(.*?):(.*?):(.*?)\]/g;
    const mailtoMatch = content.match(mailtoRegex);

    if (mailtoMatch) {
      // Extract the first MAILTO token
      const fullToken = mailtoMatch[0];
      // Parse the components
      const tokenParts = fullToken
        .replace("[MAILTO:", "")
        .replace("]", "")
        .split(":");

      if (tokenParts.length >= 3) {
        const [email, subject, ...bodyParts] = tokenParts;
        const body = bodyParts.join(":"); // Rejoin body parts that might have been split by ':'

        // Remove the token from display text
        const displayText = content.replace(mailtoRegex, "");

        return (
          <View>
            <Text style={styles.messageText}>{displayText.trim()}</Text>
            <TouchableOpacity
              style={styles.emailButton}
              onPress={() => handleEmailPress(email, subject, body)}
            >
              <Text style={styles.buttonText}>Contact Academic Advisor</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }

    // Check for HTML content with email links
    if (
      content.includes("<a") &&
      (content.includes("mailto:") || content.includes("mail.google.com"))
    ) {
      // Extract email addresses
      const mailtoRegex = /mailto:([^"'\s]+)/g;
      const gmailRegex =
        /https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&to=([^"'\s&]+)/g;

      const mailtoMatches = content.match(mailtoRegex);
      const gmailMatches = content.match(gmailRegex);

      let email = "";

      // Process mailto links
      if (mailtoMatches && mailtoMatches.length > 0) {
        email = mailtoMatches[0].replace("mailto:", "");
      }
      // Process Gmail links if no mailto found
      else if (gmailMatches && gmailMatches.length > 0) {
        const parts = gmailMatches[0].split("to=");
        if (parts.length > 1) {
          email = parts[1].split("&")[0];
        }
      }

      if (email) {
        // Clean display text by removing HTML tags
        const plainText = content
          .replace(/<[^>]*>|&[^;]+;/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        return (
          <View>
            <Text style={styles.messageText}>{plainText}</Text>
            <TouchableOpacity
              style={styles.emailButton}
              onPress={() => handleEmailPress(email)}
            >
              <Text style={styles.buttonText}>Contact Academic Advisor</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }

    // No email information found, just return the text
    return <Text style={styles.messageText}>{content}</Text>;
  };

  // Handle email button press
  const handleEmailPress = async (
    email: string,
    subject: string = "Academic Advising Question",
    body: string = ""
  ) => {
    try {
      // Decode URI components if they appear to be encoded
      const decodedSubject = subject.includes("%")
        ? decodeURIComponent(subject)
        : subject;
      const decodedBody = body.includes("%") ? decodeURIComponent(body) : body;

      // Create mailto URL with properly encoded parameters
      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
        decodedSubject
      )}&body=${encodeURIComponent(decodedBody)}`;

      // Check if device can handle mailto links
      const canOpen = await Linking.canOpenURL(mailtoUrl);

      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        // Show manual instructions if mailto isn't supported
        Alert.alert(
          "Email App Not Found",
          `Please send an email manually to:\n\n${email}\n\nSubject: ${decodedSubject}`,
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

const styles = StyleSheet.create({
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#333",
  },
  emailButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginVertical: 12,
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
