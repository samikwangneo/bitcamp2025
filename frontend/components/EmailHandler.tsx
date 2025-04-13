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
  // Extract email information from text content
  const parseContent = (content: string) => {
    // First, check if content contains HTML with email links
    if (
      content.includes('<a href="mailto:') ||
      content.includes('<a href="https://mail.google.com')
    ) {
      // Extract the mailto or Gmail link
      let emailAddress = "";
      let subject = "";
      let body = "";

      // Try to extract mailto link
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

      // If no mailto link, try to extract Gmail link
      if (!emailAddress) {
        const gmailMatch = content.match(
          /<a href="https:\/\/mail\.google\.com\/mail\/\?[^"]*to=([^"&]+)[^"]*"/i
        );
        if (gmailMatch && gmailMatch[1]) {
          emailAddress = decodeURIComponent(gmailMatch[1]);

          const subjectMatch =
            content.match(/su=([^"&]+)/i) || content.match(/subject=([^"&]+)/i);
          if (subjectMatch) {
            subject = decodeURIComponent(subjectMatch[1]);
          }

          const bodyMatch = content.match(/body=([^"&]+)/i);
          if (bodyMatch) {
            body = decodeURIComponent(bodyMatch[1]);
          }
        }
      }

      if (emailAddress) {
        // Clean the content by removing HTML tags
        const cleanText = content
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/\s+/g, " ")
          .trim();

        return (
          <View style={styles.container}>
            <Text style={styles.messageText}>{cleanText}</Text>
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

    // Check for any URL that might be embedded in the text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);

    if (urls && urls.length > 0) {
      // Check if any URL is a Gmail compose URL
      const gmailUrl = urls.find(
        (url) =>
          url.includes("mail.google.com/mail/?view=cm") && url.includes("to=")
      );

      if (gmailUrl) {
        try {
          // Extract email parameters from the URL
          const emailMatch = gmailUrl.match(/to=([^&]+)/);
          const subjectMatch =
            gmailUrl.match(/su=([^&]+)/) || gmailUrl.match(/subject=([^&]+)/);
          const bodyMatch = gmailUrl.match(/body=([^&]+)/);

          const emailAddress = emailMatch
            ? decodeURIComponent(emailMatch[1])
            : "";
          const subject = subjectMatch
            ? decodeURIComponent(subjectMatch[1])
            : "";
          const body = bodyMatch ? decodeURIComponent(bodyMatch[1]) : "";

          // Remove the Gmail URL from the displayed text
          const cleanText = content.replace(gmailUrl, "").trim();

          return (
            <View style={styles.container}>
              <Text style={styles.messageText}>{cleanText}</Text>
              <TouchableOpacity
                style={styles.emailButton}
                onPress={() => handleEmailPress(emailAddress, subject, body)}
              >
                <Text style={styles.buttonText}>Contact Academic Advisor</Text>
              </TouchableOpacity>
            </View>
          );
        } catch (error) {
          console.error("Error parsing Gmail URL:", error);
        }
      }
    }

    // If no email links found, just display the text
    return <Text style={styles.messageText}>{content}</Text>;
  };

  // Handle email button press by opening the device's mail app
  const handleEmailPress = async (
    email: string,
    subject: string = "",
    body: string = ""
  ) => {
    try {
      // Build mailto URL with proper encoding
      const mailtoUrl = `mailto:${email}?${
        subject ? `subject=${encodeURIComponent(subject)}` : ""
      }${subject && body ? "&" : ""}${
        body ? `body=${encodeURIComponent(body)}` : ""
      }`;

      console.log("Opening mail app with URL:", mailtoUrl);

      // Check if device can open mailto URLs
      const canOpen = await Linking.canOpenURL(mailtoUrl);

      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        // Show manual instructions if mailto isn't supported
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

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#333",
    marginBottom: 10,
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
