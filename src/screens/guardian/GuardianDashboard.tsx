import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';

interface EntryExitLog {
    id: string;
    type: 'entry' | 'exit';
    timestamp: any;
    distance?: number;
}

export default function GuardianDashboard({ navigation }: any) {
    const { signOut, user, linkedResidentId } = useAuth();
    const [wardName, setWardName] = useState('Loading...');
    const [wardId, setWardId] = useState<string | null>(null);
    const [attendanceCount, setAttendanceCount] = useState(0);
    const [pendingLeaves, setPendingLeaves] = useState(0);
    const [entryExitLogs, setEntryExitLogs] = useState<EntryExitLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWardStats = async () => {
            try {
                if (linkedResidentId) {
                    const residentDocRef = doc(db, 'residents', linkedResidentId);
                    const residentSnap = await getDoc(residentDocRef);

                    if (residentSnap.exists()) {
                        const residentData = residentSnap.data();
                        const studentId = residentSnap.id;
                        setWardName(residentData.name || 'Test Ward');
                        setWardId(studentId);

                        const qLeaves = query(
                            collection(db, 'leaves'),
                            where('userId', '==', studentId),
                            where('status', '==', 'pending_guardian')
                        );
                        const snapLeaves = await getDocs(qLeaves);
                        setPendingLeaves(snapLeaves.size);

                        const qLogs = query(
                            collection(db, 'entry_exit_logs'),
                            where('userId', '==', studentId),
                            orderBy('timestamp', 'desc'),
                            limit(10)
                        );
                        const snapLogs = await getDocs(qLogs);
                        const logs: EntryExitLog[] = snapLogs.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        } as EntryExitLog));
                        setEntryExitLogs(logs);
                    } else {
                        setWardName('Ward record not found');
                    }
                } else {
                    setWardName('No Ward Linked');
                }
            } catch (e) {
                console.log('Error fetching ward data:', e);
                setWardName('Demo Ward');
            } finally {
                setLoading(false);
            }
        };

        fetchWardStats();
    }, [linkedResidentId]);

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

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Guardian Portal</Text>

            <View style={styles.wardCard}>
                <Text style={styles.wardLabel}>Your Ward</Text>
                <Text style={styles.wardName}>{wardName}</Text>
                <Text style={styles.wardStatus}>Status: In Hostel</Text>
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
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#f4f6f8',
        minHeight: '100%',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#2c3e50',
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
    wardStatus: {
        color: 'white',
        fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
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
