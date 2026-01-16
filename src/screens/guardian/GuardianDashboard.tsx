import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import LoadingScreen from '../../components/LoadingScreen';

interface EntryExitLog {
    id: string;
    type: 'entry' | 'exit';
    timestamp: any;
    distance?: number;
}

export default function GuardianDashboard({ navigation }: any) {
    const { signOut, user, linkedResidentId } = useAuth();
    const { colors, theme, toggleTheme } = useTheme();
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

                    // 1. Fetch Ward Profile Info
                    try {
                        const residentDocRef = doc(db, 'residents', linkedResidentId);
                        const residentSnap = await getDoc(residentDocRef);
                        if (residentSnap.exists()) {
                            const residentData = residentSnap.data();
                            setWardName(residentData.name || 'Resident');
                        } else {
                            setWardName('Ward record not found');
                        }
                    } catch (err) {
                        console.error('[GuardianDash] Error fetching ward info:', err);
                        setWardName('Error loading name');
                    }

                    // 2. Fetch Pending Leaves (Isolated/Resilient)
                    try {
                        const qLeaves = query(
                            collection(db, 'leaves'),
                            where('residentId', '==', linkedResidentId),
                            where('status', '==', 'pending_guardian')
                        );
                        const snapLeaves = await getDocs(qLeaves);
                        setPendingLeaves(snapLeaves.size);
                    } catch (err) {
                        console.error('[GuardianDash] Error fetching leaves:', err);
                        setPendingLeaves(0);
                    }

                    // 3. Fetch Entry/Exit Logs (Isolated with Fallback)
                    try {
                        const logsRef = collection(db, 'entry_exit_logs');
                        const qLogs = query(
                            logsRef,
                            where('residentId', '==', linkedResidentId),
                            orderBy('timestamp', 'desc'),
                            limit(10)
                        );

                        let snapLogs;
                        try {
                            snapLogs = await getDocs(qLogs);
                        } catch (indexError) {
                            console.warn('[GuardianDash] Index missing for logs, falling back to client-sort');
                            const qFallback = query(
                                logsRef,
                                where('residentId', '==', linkedResidentId)
                            );
                            snapLogs = await getDocs(qFallback);
                        }

                        const logs: EntryExitLog[] = snapLogs.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        } as EntryExitLog));

                        // Client-side sort if it was a fallback query
                        if (logs.length > 0 && !logs[0].timestamp?.toDate) {
                            logs.sort((a, b) => {
                                const timeA = a.timestamp?.toMillis() || 0;
                                const timeB = b.timestamp?.toMillis() || 0;
                                return timeB - timeA;
                            });
                        }

                        // Determine most recent status AFTER sorting
                        if (logs.length > 0) {
                            const latest = logs[0];
                            setWardStatus(latest.type === 'entry' ? 'In Hostel' : 'Left Campus');
                            setLastLogTime(formatTimestamp(latest.timestamp));
                        }

                        setEntryExitLogs(logs.slice(0, 10));
                    } catch (err) {
                        console.error('[GuardianDash] Error fetching logs:', err);
                        setEntryExitLogs([]);
                    }

                } catch (e) {
                    console.log('Global Guardian Stats Error:', e);
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
        return date.toLocaleString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return <LoadingScreen message="Loading ward information..." />;
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                        <Image source={require('../../../assets/logo.jpg')} style={styles.logo} resizeMode="contain" />
                        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">Guardian Portal</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
                            <Text style={{ fontSize: 22 }}>{theme === 'light' ? '🌙' : '☀️'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.iconBtn}>
                            <Text style={{ fontSize: 24 }}>👤</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.wardCard}>
                    <Text style={styles.wardLabel}>Your Ward</Text>
                    <Text style={styles.wardName}>{wardName}</Text>
                    <View style={[
                        styles.wardStatusBadge,
                        { backgroundColor: wardStatus === 'In Hostel' ? 'rgba(255,255,255,0.2)' : '#e67e22' }
                    ]}>
                        <Text style={styles.wardStatusText}>
                            {wardStatus === 'In Hostel' ? '📍 In Hostel' : `🚶 Left Campus (${lastLogTime || 'Unknown'})`}
                        </Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Overview</Text>

                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{pendingLeaves}</Text>
                        <Text style={styles.statLabel}>Pending Leaves</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>--</Text>
                        <Text style={styles.statLabel}>Attendance %</Text>
                    </View>
                </View>

                {/* Entry/Exit Logs Section */}
                <Text style={styles.sectionTitle}>Entry/Exit Logs</Text>
                {loading ? (
                    <ActivityIndicator size="large" color="#27ae60" />
                ) : entryExitLogs.length > 0 ? (
                    <View style={styles.logsCard}>
                        {entryExitLogs.map((log) => (
                            <View key={log.id} style={styles.logItem}>
                                <View style={[
                                    styles.logBadge,
                                    { backgroundColor: log.type === 'entry' ? '#4CAF50' : '#FF5252' }
                                ]}>
                                    <Text style={styles.logBadgeText}>
                                        {log.type === 'entry' ? '➡️ Entry' : '⬅️ Exit'}
                                    </Text>
                                </View>
                                <View style={styles.logDetails}>
                                    <Text style={styles.logTime}>{formatTimestamp(log.timestamp)}</Text>
                                    {log.distance && (
                                        <Text style={styles.logDistance}>{log.distance.toFixed(0)}m from campus</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No entry/exit logs yet</Text>
                    </View>
                )}

                <Text style={styles.sectionTitle}>Actions</Text>

                <View style={styles.grid}>
                    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('GuardianLeave')}>
                        <Text style={styles.icon}>📝</Text>
                        <Text style={styles.cardText}>Approve Leaves</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.card} onPress={() => Alert.alert('Coming Soon', 'Attendance History View')}>
                        <Text style={styles.icon}>🕒</Text>
                        <Text style={styles.cardText}>View Attendance Logs</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    container: {
        backgroundColor: '#f4f6f8',
        minHeight: '100%',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    logo: {
        width: 40,
        height: 40,
        marginRight: 10,
        borderRadius: 8,
    },
    iconBtn: {
        backgroundColor: 'rgba(150,150,150,0.1)',
        padding: 8,
        borderRadius: 20,
    },
    wardCard: {
        backgroundColor: '#27ae60',
        padding: 20,
        borderRadius: 15,
        marginBottom: 25,
        alignItems: 'center',
    },
    wardLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginBottom: 5,
    },
    wardName: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    wardStatusBadge: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    wardStatusText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#34495e',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    statCard: {
        width: '48%',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    statNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    statLabel: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    logsCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 25,
        elevation: 2,
    },
    logItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    logBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 12,
    },
    logBadgeText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
    },
    logDetails: {
        flex: 1,
    },
    logTime: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 2,
    },
    logDistance: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    emptyState: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 30,
        alignItems: 'center',
        marginBottom: 25,
    },
    emptyText: {
        color: '#7f8c8d',
        fontSize: 14,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    card: {
        width: '47%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        elevation: 2,
    },
    icon: {
        fontSize: 28,
        marginBottom: 10,
    },
    cardText: {
        fontWeight: '600',
        textAlign: 'center',
    },
    logoutBtn: {
        marginTop: 30,
        alignSelf: 'center',
    },
    logoutText: {
        color: '#c0392b',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
