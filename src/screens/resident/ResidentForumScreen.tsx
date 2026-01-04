import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { sendBulkNotifications } from '../../utils/notificationUtils';
import { Switch } from 'react-native';

export default function ResidentForumScreen() {
    const { user, userRole } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [notifyAll, setNotifyAll] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        // Real-time listener
        const q = query(collection(db, 'forum_posts'), orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMsgs: any[] = [];
            snapshot.forEach((doc) => {
                fetchedMsgs.push({ id: doc.id, ...doc.data() });
            });
            setMessages(fetchedMsgs);
            setLoading(false);
            // Scroll to bottom on new message
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        });

        return () => unsubscribe();
    }, []);

    const sendMessage = async () => {
        if (inputText.trim().length === 0) return;

        try {
            const messageData = {
                text: inputText,
                userId: user?.uid || 'anonymous',
                userName: userRole === 'admin' ? 'Admin' : 'Resident',
                createdAt: serverTimestamp(),
                notifyAll: notifyAll
            };

            await addDoc(collection(db, 'forum_posts'), messageData);

            if (notifyAll) {
                // Fetch all users with push tokens
                const usersSnap = await getDocs(query(collection(db, 'users'), where('pushToken', '!=', null)));
                const tokens: string[] = [];
                usersSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.pushToken && doc.id !== user?.uid) {
                        tokens.push(data.pushToken);
                    }
                });

                if (tokens.length > 0) {
                    await sendBulkNotifications(
                        tokens,
                        'New Important Forum Post',
                        `${messageData.userName}: ${messageData.text.substring(0, 50)}${messageData.text.length > 50 ? '...' : ''}`,
                        { type: 'forum', messageId: 'bulk' }
                    );
                }
            }

            setInputText('');
            setNotifyAll(false);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const renderItem = ({ item }: any) => {
        const isMe = item.userId === user?.uid;
        return (
            <View style={[styles.bubbleContainer, isMe ? styles.rightContainer : styles.leftContainer]}>
                <View style={[styles.bubble, isMe ? styles.rightBubble : styles.leftBubble]}>
                    {!isMe && <Text style={styles.senderName}>{item.userName}</Text>}
                    <Text style={[styles.messageText, isMe ? styles.rightText : styles.leftText]}>{item.text}</Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={90}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Community Forum</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            )}

            <View style={styles.inputWrapper}>
                {userRole === 'admin' || true ? ( // Allowing everyone for demo, can restrict to admin if needed
                    <View style={styles.notifyRow}>
                        <Text style={styles.notifyLabel}>📣 Notify Everyone</Text>
                        <Switch
                            value={notifyAll}
                            onValueChange={setNotifyAll}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={notifyAll ? "#0084ff" : "#f4f3f4"}
                        />
                    </View>
                ) : null}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        multiline
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                        <Text style={styles.sendText}>➤</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5',
    },
    header: {
        padding: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
    },
    list: {
        padding: 10,
        paddingBottom: 20,
    },
    bubbleContainer: {
        marginBottom: 10,
        width: '100%',
        flexDirection: 'row',
    },
    rightContainer: {
        justifyContent: 'flex-end',
    },
    leftContainer: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '75%',
        padding: 10,
        borderRadius: 15,
    },
    rightBubble: {
        backgroundColor: '#0084ff',
        borderBottomRightRadius: 2,
    },
    leftBubble: {
        backgroundColor: 'white',
        borderBottomLeftRadius: 2,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    senderName: {
        fontSize: 10,
        color: 'gray',
        marginBottom: 2,
        fontWeight: 'bold',
    },
    messageText: {
        fontSize: 15,
    },
    rightText: {
        color: 'white',
    },
    leftText: {
        color: 'black',
    },
    inputWrapper: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    notifyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 15,
        paddingTop: 8,
    },
    notifyLabel: {
        fontSize: 12,
        color: '#666',
        marginRight: 8,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: 'white',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: '#eee',
    },
    sendBtn: {
        backgroundColor: '#0084ff',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendText: {
        color: 'white',
        fontSize: 18,
    }
});
