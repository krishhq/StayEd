import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function AttendanceLogScreen() {
    const { hostelId } = useAuth();
    const { colors } = useTheme();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'attendance' | 'entry_exit'>('attendance');

    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.text },
        card: { backgroundColor: colors.card, borderColor: colors.border },
        subText: { color: colors.subText }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            if (!hostelId) return;

            const collectionName = activeTab === 'attendance' ? 'attendance' : 'entry_exit_logs';
            console.log(`[AttendanceLog] Fetching from ${collectionName} for hostel: ${hostelId}`);

            const q = query(
                collection(db, collectionName),
                where('hostelId', '==', hostelId),
                orderBy('timestamp', 'desc'),
                limit(50)
            );
            const querySnapshot = await getDocs(q);
            const fetched: any[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                let timeString = 'Unknown Time';
                if (data.timestamp) {
                    const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    timeString = date.toLocaleString();
                }

                fetched.push({ id: doc.id, ...data, timeString });
            });
            setLogs(fetched);
        } catch (error: any) {
            console.error(`[AttendanceLog] Fetch Error (${activeTab}):`, error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [hostelId, activeTab]);

    const renderItem = ({ item }: any) => (
        <View style={[styles.row, dynamicStyles.card]}>
            <View>
                <Text style={[styles.residentId, dynamicStyles.text]}>Resident ID: {item.residentId || 'Unknown'}</Text>
                <Text style={[styles.timestamp, dynamicStyles.subText]}>{item.timeString}</Text>
                {activeTab === 'attendance' && item.distance !== undefined && (
                    <Text style={[styles.distance, dynamicStyles.subText]}>📍 {item.distance.toFixed(1)}m from center</Text>
                )}
            </View>
            <View style={styles.rightContent}>
                {activeTab === 'attendance' ? (
                    <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
                        <Text style={styles.badgeText}>Present</Text>
                    </View>
                ) : (
                    <View style={[styles.badge, { backgroundColor: item.type === 'entry' ? '#2196F3' : '#F44336' }]}>
                        <Text style={styles.badgeText}>{item.type === 'entry' ? 'Entry' : 'Exit'}</Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, dynamicStyles.container]}>
            {/* Tab Bar */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'attendance' && styles.activeTab]}
                    onPress={() => setActiveTab('attendance')}
                >
                    <Text style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>Daily Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'entry_exit' && styles.activeTab]}
                    onPress={() => setActiveTab('entry_exit')}
                >
                    <Text style={[styles.tabText, activeTab === 'entry_exit' && styles.activeTabText]}>Entry/Exit Logs</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    onRefresh={fetchLogs}
                    refreshing={loading}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={[styles.empty, dynamicStyles.subText]}>No activity logs found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.05)',
        margin: 15,
        borderRadius: 10,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#007AFF',
    },
    tabText: {
        fontWeight: 'bold',
        color: '#666',
    },
    activeTabText: {
        color: 'white',
    },
    list: {
        padding: 15,
        paddingTop: 0,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    residentId: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2,
    },
    timestamp: {
        fontSize: 12,
        marginBottom: 4,
    },
    distance: {
        fontSize: 11,
        fontStyle: 'italic',
    },
    rightContent: {
        alignItems: 'flex-end',
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    empty: {
        fontSize: 16,
    }
});
