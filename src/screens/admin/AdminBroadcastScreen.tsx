import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { createBroadcast } from '../../services/firestoreService';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { sendBulkNotifications } from '../../utils/notificationUtils';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function AdminBroadcastScreen() {
    const { hostelId, user } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'normal' | 'emergency'>('normal');
    const [showInBanner, setShowInBanner] = useState(true);
    const [showInForum, setShowInForum] = useState(true);
    const [loading, setLoading] = useState(false);

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
            if (showInBanner) {
                await createBroadcast({
                    hostelId,
                    title,
                    message,
                    priority,
                    senderId: user.uid,
                });
            }

            if (showInForum) {
                await addDoc(collection(db, 'forum_posts'), {
                    text: message,
                    userId: user.uid,
                    userName: 'Admin',
                    hostelId,
                    postType: 'admin_broadcast',
                    priority: priority,
                    createdAt: serverTimestamp(),
                    notifyAll: true
                });
            }

            if (showInBanner || showInForum) {
                try {
                    let usersSnap;
                    const qPrimary = query(
                        collection(db, 'users'),
                        where('hostelId', '==', hostelId),
                        where('role', '==', 'resident'),
                        where('pushToken', '!=', null)
                    );

                    try {
                        usersSnap = await getDocs(qPrimary);
                    } catch (indexError) {
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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Broadcast Unit" onBackPress={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Card style={styles.formCard}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Compose Message</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.subText }]}>Title</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="e.g. Water Maintenance Notice"
                            placeholderTextColor={colors.subText + '50'}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.subText }]}>Detailed Announcement</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            value={message}
                            onChangeText={setMessage}
                            placeholder="Provide full details here..."
                            placeholderTextColor={colors.subText + '50'}
                            multiline
                            numberOfLines={6}
                        />
                    </View>
                </Card>

                <Card style={styles.settingsCard} variant="outlined">
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Distribution Settings</Text>

                    <View style={[styles.settingRow, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>Dashboard Alert</Text>
                            <Text style={[styles.settingDesc, { color: colors.subText }]}>Shows as a banner on top</Text>
                        </View>
                        <Switch
                            value={showInBanner}
                            onValueChange={setShowInBanner}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor="white"
                        />
                    </View>

                    <View style={[styles.settingRow, { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>Community Forum</Text>
                            <Text style={[styles.settingDesc, { color: colors.subText }]}>Posts in the public feed</Text>
                        </View>
                        <Switch
                            value={showInForum}
                            onValueChange={setShowInForum}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor="white"
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: '#F43F5E' }]}>緊急事態 (Emergency)</Text>
                            <Text style={[styles.settingDesc, { color: colors.subText }]}>Mark as critical alert</Text>
                        </View>
                        <Switch
                            value={priority === 'emergency'}
                            onValueChange={(val) => setPriority(val ? 'emergency' : 'normal')}
                            trackColor={{ false: colors.border, true: '#F43F5E' }}
                            thumbColor="white"
                        />
                    </View>
                </Card>

                <TouchableOpacity
                    style={[
                        styles.sendBtn,
                        { backgroundColor: priority === 'emergency' ? '#F43F5E' : colors.primary },
                        loading && { opacity: 0.7 }
                    ]}
                    onPress={handleSend}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.sendText}>Broadcast to All Residents</Text>
                    )}
                </TouchableOpacity>

                <Card style={[styles.infoCard, { backgroundColor: colors.primary + '05', borderColor: colors.primary + '20' }]} variant="outlined">
                    <Text style={[styles.infoText, { color: colors.subText }]}>
                        💡 This notification will reach all registered residents via push message and remain in their archives until the expiration date.
                    </Text>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    formCard: {
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.lg,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
        marginBottom: Spacing.xs,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: Typography.size.sm,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    settingsCard: {
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    settingInfo: {
        flex: 1,
    },
    settingLabel: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.bold,
        marginBottom: 2,
    },
    settingDesc: {
        fontSize: Typography.size.xs,
    },
    sendBtn: {
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        ...Shadows.md,
        marginBottom: Spacing.xl,
    },
    sendText: {
        color: 'white',
        fontWeight: Typography.weight.bold,
        fontSize: Typography.size.md,
    },
    infoCard: {
        padding: Spacing.md,
        alignItems: 'center',
    },
    infoText: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 16,
    }
});

