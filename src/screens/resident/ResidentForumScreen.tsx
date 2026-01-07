import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { sendBulkNotifications } from '../../utils/notificationUtils';
import { Switch } from 'react-native';

export default function ResidentForumScreen() {
    const { user, userRole, hostelId } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [notifyAll, setNotifyAll] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!hostelId) return;

        let unsubscribeOuter: () => void;

        const startListener = (useOrderBy: boolean) => {
            let q;
            if (userRole === 'admin') {
                q = useOrderBy ? query(
                    collection(db, 'forum_posts'),
                    where('hostelId', '==', hostelId),
                    where('postType', '==', 'admin_broadcast'),
                    orderBy('createdAt', 'asc')
                ) : query(
                    collection(db, 'forum_posts'),
                    where('hostelId', '==', hostelId),
                    where('postType', '==', 'admin_broadcast')
                );
            } else {
                q = useOrderBy ? query(
                    collection(db, 'forum_posts'),
                    where('hostelId', '==', hostelId),
                    orderBy('createdAt', 'asc')
                ) : query(
                    collection(db, 'forum_posts'),
                    where('hostelId', '==', hostelId)
                );
            }

            return onSnapshot(q, (snapshot) => {
                const fetchedMsgs: any[] = [];
                snapshot.forEach((doc) => {
                    fetchedMsgs.push({ id: doc.id, ...doc.data() });
                });

                if (!useOrderBy) {
                    // Manual sort if index missing
                    fetchedMsgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
                }

                setMessages(fetchedMsgs);
                setLoading(false);
                // Scroll to bottom
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }, (error) => {
                if (useOrderBy && (error.code === 'failed-precondition' || error.message.includes('index'))) {
                    console.warn('[ResidentForum] Index missing, falling back to client-side sort');
                    unsubscribeOuter?.();
                    unsubscribeOuter = startListener(false);
                } else {
                    console.error('[ResidentForum] Listener error:', error);
                }
            });
        };

        unsubscribeOuter = startListener(true);
        return () => unsubscribeOuter?.();
    }, [hostelId, userRole]);

    const sendMessage = async () => {
        if (inputText.trim().length === 0) return;

        try {
            const postType = userRole === 'admin' ? 'admin_broadcast' : 'resident_msg';
            const messageData = {
                text: inputText,
                userId: user?.uid || 'anonymous',
                userName: userRole === 'admin' ? 'Admin' : (user?.displayName || 'Resident'),
                hostelId: hostelId,
                postType: postType, // Explicitly label the post type
                createdAt: serverTimestamp(),
                notifyAll: userRole === 'admin' // Force notifyAll for Admin broadcasts
            };

            await addDoc(collection(db, 'forum_posts'), messageData);

            if (messageData.notifyAll && hostelId) {
                try {
                    let usersSnap;
                    try {
                        const q = query(
                            collection(db, 'users'),
                            where('hostelId', '==', hostelId),
                            where('pushToken', '!=', null)
                        );
                        usersSnap = await getDocs(q);
                    } catch (indexError) {
                        console.warn('[ResidentForum] Index missing for push notifications, falling back to manual filter');
                        const qFallback = query(
                            collection(db, 'users'),
                            where('hostelId', '==', hostelId)
                        );
                        usersSnap = await getDocs(qFallback);
                    }

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
                } catch (notifErr) {
                    console.error('[ResidentForum] Notification error:', notifErr);
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
        const isAdminBroadcast = item.postType === 'admin_broadcast';
        const isEmergency = item.priority === 'emergency';

        return (
            <View style={[
                styles.bubbleContainer,
                isMe ? styles.rightContainer : styles.leftContainer,
                isAdminBroadcast && styles.broadcastContainer
            ]}>
                <View style={[
                    styles.bubble,
                    isMe ? styles.rightBubble : styles.leftBubble,
                    isAdminBroadcast && (isEmergency ? styles.emergencyBubble : styles.noticeBubble)
                ]}>
                    <View style={styles.bubbleHeader}>
                        <Text style={[
                            styles.senderName,
                            (isMe || isAdminBroadcast) && { color: 'rgba(255,255,255,0.7)' }
                        ]}>
                            {isAdminBroadcast ? (isEmergency ? '🚨 EMERGENCY' : '📢 NOTICE') : item.userName}
                        </Text>
                        {isAdminBroadcast && <Text style={styles.broadcastTag}>Official</Text>}
                    </View>
                    <Text style={[
                        styles.messageText,
                        (isMe || isAdminBroadcast) ? styles.rightText : styles.leftText
                    ]}>{item.text}</Text>
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
                {userRole === 'admin' ? (
                    <View style={styles.adminNote}>
                        <Text style={styles.adminNoteText}>📢 You are broadcasting to all residents.</Text>
                    </View>
                ) : (
                    <View style={styles.notifyRow}>
                        <Text style={styles.notifyLabel}>📣 Notify Everyone</Text>
                        <Switch
                            value={notifyAll}
                            onValueChange={setNotifyAll}
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={notifyAll ? "#0084ff" : "#f4f3f4"}
                        />
                    </View>
                )}
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
    },
    adminNote: {
        padding: 5,
        backgroundColor: '#fff3cd',
        alignItems: 'center',
    },
    adminNoteText: {
        fontSize: 10,
        color: '#856404',
        fontWeight: 'bold',
    },
    broadcastContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 10,
    },
    noticeBubble: {
        backgroundColor: '#0984e3',
        width: '90%',
        borderRadius: 12,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    emergencyBubble: {
        backgroundColor: '#d63031',
        width: '90%',
        borderRadius: 12,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    bubbleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    broadcastTag: {
        fontSize: 8,
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
        fontWeight: 'bold',
    }
});
