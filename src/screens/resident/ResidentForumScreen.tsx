import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { sendBulkNotifications } from '../../utils/notificationUtils';
import ScreenHeader from '../../components/ScreenHeader';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function ResidentForumScreen() {
    const { user, userRole, hostelId } = useAuth();
    const { colors, theme } = useTheme();
    const navigation = useNavigation();
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
                    fetchedMsgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
                }

                setMessages(fetchedMsgs);
                setLoading(false);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }, (error) => {
                if (useOrderBy && (error.code === 'failed-precondition' || error.message.includes('index'))) {
                    unsubscribeOuter?.();
                    unsubscribeOuter = startListener(false);
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
                postType: postType,
                createdAt: serverTimestamp(),
                notifyAll: userRole === 'admin'
            };

            await addDoc(collection(db, 'forum_posts'), messageData);

            if (messageData.notifyAll && hostelId) {
                try {
                    const q = query(collection(db, 'users'), where('hostelId', '==', hostelId));
                    const usersSnap = await getDocs(q);
                    const tokens: string[] = [];
                    usersSnap.forEach(doc => {
                        const data = doc.data();
                        if (data.pushToken && doc.id !== user?.uid) tokens.push(data.pushToken);
                    });
                    if (tokens.length > 0) {
                        await sendBulkNotifications(tokens, 'New Important Forum Post', `${messageData.userName}: ${messageData.text.substring(0, 50)}...`, { type: 'forum' });
                    }
                } catch (notifErr) { console.error('Notification error:', notifErr); }
            }

            setInputText('');
            setNotifyAll(false);
        } catch (error) { console.error('Error sending message:', error); }
    };

    const renderItem = ({ item, index }: any) => {
        const isMe = item.userId === user?.uid;
        const isAdminBroadcast = item.postType === 'admin_broadcast';
        const isEmergency = item.priority === 'emergency';
        const showName = index === 0 || messages[index - 1].userId !== item.userId;
        const time = item.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isAdminBroadcast) {
            return (
                <View style={styles.broadcastContainer}>
                    <View style={[styles.broadcastBubble, { backgroundColor: isEmergency ? '#FEF2F2' : colors.primary + '08', borderColor: isEmergency ? '#FCA5A5' : colors.primary + '30' }]}>
                        <View style={styles.broadcastHeader}>
                            <View style={[styles.broadcastTag, { backgroundColor: isEmergency ? '#F43F5E' : colors.primary }]}>
                                <Text style={styles.tagText}>{isEmergency ? 'EMERGENCY' : 'OFFICIAL'}</Text>
                            </View>
                            <Text style={[styles.broadcastTime, { color: colors.subText }]}>{time}</Text>
                        </View>
                        <Text style={[styles.broadcastText, { color: colors.text }]}>{item.text}</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.msgWrapper, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                {showName && !isMe && <Text style={[styles.senderName, { color: colors.subText }]}>{item.userName}</Text>}
                <View style={[
                    styles.msgBubble,
                    isMe ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 } : { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderColor: colors.border, borderWidth: 1 }
                ]}>
                    <Text style={[styles.msgText, { color: isMe ? 'white' : colors.text }]}>{item.text}</Text>
                    <Text style={[styles.itemTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.subText }]}>{time}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Forum Feed" onBackPress={() => navigation.goBack()} />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                {loading ? (
                    <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                <View style={[styles.inputArea, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    {userRole === 'admin' ? (
                        <View style={[styles.adminBar, { backgroundColor: colors.primary + '10' }]}>
                            <Text style={[styles.adminBarText, { color: colors.primary }]}>📢 BROADCASTING TO RESIDENTS</Text>
                        </View>
                    ) : (
                        <View style={styles.notifyBar}>
                            <Text style={[styles.notifyText, { color: colors.subText }]}>Notify Everyone</Text>
                            <Switch
                                value={notifyAll}
                                onValueChange={setNotifyAll}
                                trackColor={{ false: colors.border, true: colors.primary + '80' }}
                                thumbColor={notifyAll ? colors.primary : '#f4f3f4'}
                            />
                        </View>
                    )}

                    <View style={styles.inputRow}>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.subText + '60'}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, { backgroundColor: colors.primary }, !inputText.trim() && { opacity: 0.5 }]}
                            onPress={sendMessage}
                            disabled={!inputText.trim()}
                        >
                            <Text style={styles.sendIcon}>🏹</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    list: {
        padding: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    msgWrapper: {
        marginBottom: Spacing.sm,
        maxWidth: '82%',
    },
    senderName: {
        fontSize: 9,
        fontWeight: Typography.weight.bold,
        marginLeft: 12,
        marginBottom: 4,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    msgBubble: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: 6,
        borderRadius: BorderRadius.xl,
        ...Shadows.sm,
    },
    msgText: {
        fontSize: 14,
        lineHeight: 20,
    },
    itemTime: {
        fontSize: 9,
        alignSelf: 'flex-end',
        marginTop: 2,
        fontWeight: Typography.weight.medium,
    },
    broadcastContainer: {
        marginVertical: Spacing.lg,
        alignItems: 'center',
    },
    broadcastBubble: {
        width: '100%',
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
    },
    broadcastHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    broadcastTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    tagText: {
        color: 'white',
        fontSize: 9,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
    },
    broadcastTime: {
        fontSize: 10,
        fontWeight: Typography.weight.medium,
    },
    broadcastText: {
        fontSize: 14,
        fontWeight: Typography.weight.semibold,
        lineHeight: 22,
    },
    inputArea: {
        borderTopWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    },
    adminBar: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    adminBarText: {
        fontSize: 9,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
    },
    notifyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
    },
    notifyText: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        marginRight: Spacing.sm,
        letterSpacing: 0.5,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
        gap: Spacing.sm,
    },
    input: {
        flex: 1,
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 20,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 14,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.md,
    },
    sendIcon: {
        fontSize: 18,
    },
});


