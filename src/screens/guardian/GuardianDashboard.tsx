import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import LoadingScreen from '../../components/LoadingScreen';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

interface EntryExitLog {
    id: string;
    type: 'entry' | 'exit';
    timestamp: any;
    distance?: number;
}

export default function GuardianDashboard({ navigation }: any) {
    const { signOut, linkedResidentId } = useAuth();
    const { colors, theme } = useTheme();
    const [wardName, setWardName] = useState('Loading...');
    const [wardStatus, setWardStatus] = useState<'In Hostel' | 'Left Campus' | 'Unknown'>('Unknown');
    const [lastLogTime, setLastLogTime] = useState<string | null>(null);
    const [pendingLeaves, setPendingLeaves] = useState(0);
    const [entryExitLogs, setEntryExitLogs] = useState<EntryExitLog[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchWardStats = async () => {
                if (!linkedResidentId) {
                    setWardName('No Ward Linked');
                    setLoading(false);
                    return;
                }
                try {
                    setLoading(true);

                    const residentDocRef = doc(db, 'residents', linkedResidentId);
                    const residentSnap = await getDoc(residentDocRef);
                    if (residentSnap.exists()) {
                        setWardName(residentSnap.data().name || 'Resident');
                    }

                    const qLeaves = query(collection(db, 'leaves'), where('residentId', '==', linkedResidentId), where('status', '==', 'pending_guardian'));
                    const snapLeaves = await getDocs(qLeaves);
                    setPendingLeaves(snapLeaves.size);

                    const logsRef = collection(db, 'entry_exit_logs');
                    const qLogs = query(logsRef, where('residentId', '==', linkedResidentId), orderBy('timestamp', 'desc'), limit(10));

                    let snapLogs;
                    try { snapLogs = await getDocs(qLogs); } catch {
                        snapLogs = await getDocs(query(logsRef, where('residentId', '==', linkedResidentId)));
                    }

                    const logs: EntryExitLog[] = snapLogs.docs.map(doc => ({ id: doc.id, ...doc.data() } as EntryExitLog));
                    if (logs.length > 0 && !logs[0].timestamp?.toDate) {
                        logs.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
                    }
                    if (logs.length > 0) {
                        const latest = logs[0];
                        setWardStatus(latest.type === 'entry' ? 'In Hostel' : 'Left Campus');
                        setLastLogTime(formatTimestamp(latest.timestamp));
                    }
                    setEntryExitLogs(logs.slice(0, 5));
                } catch (err) {
                    console.error('[GuardianDash] Error:', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchWardStats();
        }, [linkedResidentId])
    );

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) return <LoadingScreen message="Linking to your ward..." />;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader
                title="Warden Monitor"
                onProfilePress={() => navigation.navigate('Profile')}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Card style={[styles.wardHighlight, { backgroundColor: colors.primary }]} variant="elevated">
                    <View style={styles.wardHeader}>
                        <View style={styles.avatarCircle}>
                            <Text style={[styles.avatarText, { color: colors.primary }]}>{wardName.charAt(0)}</Text>
                        </View>
                        <View>
                            <Text style={styles.wardLabel}>RESIDENT MONITOR</Text>
                            <Text style={styles.wardName}>{wardName}</Text>
                        </View>
                    </View>
                    <View style={styles.statusRowBubble}>
                        <View style={[styles.statusIndicator, { backgroundColor: wardStatus === 'In Hostel' ? '#10B981' : '#F59E0B' }]} />
                        <Text style={styles.statusText}>{wardStatus === 'In Hostel' ? 'Currently In Hostel' : 'Outside Campus'}</Text>
                    </View>
                    {lastLogTime && (
                        <Text style={styles.lastSeen}>Last Checkpoint: {lastLogTime}</Text>
                    )}
                </Card>

                <View style={styles.statsGrid}>
                    <Card style={styles.statBox} variant="outlined">
                        <Text style={[styles.statValue, { color: colors.error }]}>{pendingLeaves}</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>Pending Leaves</Text>
                    </Card>
                    <Card style={styles.statBox} variant="outlined">
                        <Text style={[styles.statValue, { color: colors.primary }]}>98%</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>Monthly Present</Text>
                    </Card>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Movement History</Text>
                    <TouchableOpacity onPress={() => Alert.alert('History', 'Full history coming soon.')}>
                        <Text style={[styles.seeAll, { color: colors.primary }]}>View All</Text>
                    </TouchableOpacity>
                </View>

                {entryExitLogs.length > 0 ? (
                    <Card style={styles.logsCard} variant="outlined">
                        {entryExitLogs.map((log, index) => (
                            <View key={log.id} style={[styles.logRow, index === entryExitLogs.length - 1 && { borderBottomWidth: 0 }]}>
                                <View style={[styles.logIcon, { backgroundColor: log.type === 'entry' ? '#10B98115' : '#F43F5E15' }]}>
                                    <Text style={{ fontSize: 14 }}>{log.type === 'entry' ? '⬇️' : '⬆️'}</Text>
                                </View>
                                <View style={styles.logInfo}>
                                    <Text style={[styles.logType, { color: colors.text }]}>
                                        {log.type === 'entry' ? 'Entrance Checkpoint' : 'Departure Checkpoint'}
                                    </Text>
                                    <Text style={[styles.logTime, { color: colors.subText }]}>{formatTimestamp(log.timestamp)}</Text>
                                </View>
                                {log.distance && (
                                    <Text style={[styles.distance, { color: colors.subText }]}>{log.distance.toFixed(0)}m</Text>
                                )}
                            </View>
                        ))}
                    </Card>
                ) : (
                    <Card style={styles.emptyCard}>
                        <Text style={[styles.emptyText, { color: colors.subText }]}>No activity logs recorded yet.</Text>
                    </Card>
                )}

                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl, marginBottom: Spacing.md }]}>Safety Controls</Text>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: colors.card }, theme === 'light' ? Shadows.md : { borderWidth: 1, borderColor: colors.border }]}
                        onPress={() => navigation.navigate('GuardianLeave')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: colors.primary + '10' }]}>
                            <Text style={{ fontSize: 20 }}>📬</Text>
                        </View>
                        <Text style={[styles.actionText, { color: colors.text }]}>Leave Requests</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: colors.card }, theme === 'light' ? Shadows.md : { borderWidth: 1, borderColor: colors.border }]}
                        onPress={() => Alert.alert('Reports', 'Detailed logs are being generated.')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#F59E0B10' }]}>
                            <Text style={{ fontSize: 20 }}>📊</Text>
                        </View>
                        <Text style={[styles.actionText, { color: colors.text }]}>Usage Analytics</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                    <Text style={[styles.signOutText, { color: colors.error }]}>LOGOUT FROM PORTAL</Text>
                </TouchableOpacity>
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
    wardHighlight: {
        padding: Spacing.lg,
        paddingVertical: Spacing.xl,
        marginBottom: Spacing.lg,
        borderRadius: BorderRadius.xl,
    },
    wardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    avatarCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: Typography.weight.bold,
    },
    wardLabel: {
        color: 'white',
        fontSize: 9,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
        opacity: 0.8,
    },
    wardName: {
        color: 'white',
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.bold,
    },
    statusRowBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
        gap: 8,
        marginBottom: 8,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        color: 'white',
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 0.5,
    },
    lastSeen: {
        color: 'white',
        fontSize: 10,
        opacity: 0.7,
        marginLeft: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    statBox: {
        flex: 1,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    statValue: {
        fontSize: Typography.size.lg,
        fontWeight: Typography.weight.bold,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: Typography.weight.bold,
        letterSpacing: 0.5,
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    seeAll: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
    },
    logsCard: {
        paddingVertical: Spacing.xs,
    },
    logRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    logIcon: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    logInfo: {
        flex: 1,
    },
    logType: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.semibold,
    },
    logTime: {
        fontSize: 10,
        marginTop: 2,
    },
    distance: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
    },
    emptyCard: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: Typography.size.xs,
    },
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    actionCard: {
        flex: 1,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    actionIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
    },
    signOutBtn: {
        marginTop: Spacing.xxl,
        alignItems: 'center',
        padding: Spacing.md,
    },
    signOutText: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
    },
});


