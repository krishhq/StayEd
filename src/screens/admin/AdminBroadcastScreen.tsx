import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { createBroadcast, getUserByPhone } from '../../services/firestoreService';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { sendBulkNotifications } from '../../utils/notificationUtils';

export default function AdminBroadcastScreen({ navigation }: any) {
    const { hostelId, user } = useAuth();
    const { colors } = useTheme();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'normal' | 'emergency'>('normal');
    const [showInBanner, setShowInBanner] = useState(true);
    const [showInForum, setShowInForum] = useState(true);
    const [loading, setLoading] = useState(false);

    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.text },
        input: { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
        card: { backgroundColor: colors.card, borderColor: colors.border },
    };

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert('Error', 'Please enter both title and message');
            return;
        }

        if (!hostelId || !user) {
            Alert.alert('Error', 'Hostel ID not found');
            return;
        }

        setLoading(true);
        try {
            // 1. Save to Broadcasts (Dashboard Banner)
            if (showInBanner) {
                await createBroadcast({
                    hostelId,
                    title,
                    message,
                    priority,
                    senderId: user.uid,
                });
            }

            // 2. Save to Forum (One-Way Broadcast)
            if (showInForum) {
                await addDoc(collection(db, 'forum_posts'), {
                    text: message, // Use direct message
                    userId: user.uid,
                    userName: 'Admin',
                    hostelId,
                    postType: 'admin_broadcast',
                    priority: priority, // Pass priority (normal/emergency) for styling
                    createdAt: serverTimestamp(),
                    notifyAll: true
                });
            }

            // 3. Fetch all residents for push notifications
            if (showInBanner || showInForum) {
                try {
                    let usersSnap;
                    try {
                        const q = query(
                            collection(db, 'users'),
                            where('hostelId', '==', hostelId),
                            where('role', '==', 'resident'),
                            where('pushToken', '!=', null)
                        );
                        usersSnap = await getDocs(q);
                    } catch (indexError) {
                        console.warn('[AdminBroadcast] Index missing for push tokens, falling back to client-side filter');
                        const qFallback = query(
                            collection(db, 'users'),
                            where('hostelId', '==', hostelId),
                            where('role', '==', 'resident')
                        );
                        usersSnap = await getDocs(qFallback);
                    }

                    const tokens: string[] = [];
                    usersSnap.forEach(doc => {
                        const data = doc.data();
                        if (data.pushToken) {
                            tokens.push(data.pushToken);
                        }
                    });

                    if (tokens.length > 0) {
                        await sendBulkNotifications(
                            tokens,
                            priority === 'emergency' ? `🚨 EMERGENCY: ${title}` : `📢 Broadcast: ${title}`,
                            message.substring(0, 100),
                            { type: 'broadcast', priority }
                        );
                    }
                } catch (notifError) {
                    console.error('[AdminBroadcast] Notification delivery failed:', notifError);
                    // We don't Alert.alert here because the broadcast itself was saved (UX choice)
                }
            }

            Alert.alert('Success', 'Broadcast sent to all residents');
            setTitle('');
            setMessage('');
            setPriority('normal');
            navigation.goBack();
        } catch (error: any) {
            console.error('Broadcast Error:', error);
            Alert.alert('Error', 'Failed to send broadcast');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={[styles.container, dynamicStyles.container]}>
            <Text style={[styles.label, dynamicStyles.text]}>Broadcast Title*</Text>
            <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Maintenance Work"
                placeholderTextColor={colors.subText}
            />

            <Text style={[styles.label, dynamicStyles.text]}>Message*</Text>
            <TextInput
                style={[styles.input, styles.textArea, dynamicStyles.input]}
                value={message}
                onChangeText={setMessage}
                placeholder="Details of the broadcast..."
                placeholderTextColor={colors.subText}
                multiline
                numberOfLines={6}
            />

            <View style={styles.priorityRow}>
                <Text style={[styles.label, dynamicStyles.text]}>Show in Dashboard Banner</Text>
                <Switch
                    value={showInBanner}
                    onValueChange={setShowInBanner}
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                />
            </View>

            <View style={styles.priorityRow}>
                <Text style={[styles.label, dynamicStyles.text]}>Post in Community Forum</Text>
                <Switch
                    value={showInForum}
                    onValueChange={setShowInForum}
                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                />
            </View>

            <View style={styles.priorityRow}>
                <Text style={[styles.label, dynamicStyles.text]}>Mark as Emergency 🚨</Text>
                <Switch
                    value={priority === 'emergency'}
                    onValueChange={(val) => setPriority(val ? 'emergency' : 'normal')}
                    trackColor={{ false: "#767577", true: "#ff7675" }}
                    thumbColor={priority === 'emergency' ? "#d63031" : "#f4f3f4"}
                />
            </View>

            <TouchableOpacity
                style={[
                    styles.sendBtn,
                    { backgroundColor: priority === 'emergency' ? '#d63031' : '#007AFF' }
                ]}
                onPress={handleSend}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.sendText}>Send Broadcast to All Residents</Text>
                )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    Note: This will send a push notification to all {priority === 'emergency' ? 'emergency-aware' : ''} residents in your hostel.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        flexGrow: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 15,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
    },
    textArea: {
        height: 150,
        textAlignVertical: 'top',
    },
    priorityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 20,
        padding: 10,
        backgroundColor: 'rgba(150,150,150,0.1)',
        borderRadius: 10,
    },
    sendBtn: {
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        elevation: 3,
    },
    sendText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    infoBox: {
        marginTop: 30,
        padding: 15,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 10,
    },
    infoText: {
        fontSize: 12,
        color: 'gray',
        textAlign: 'center',
        lineHeight: 18,
    }
});
