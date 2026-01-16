import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, orderBy, limit, onSnapshot, QuerySnapshot, FirestoreError, getDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function AttendanceLogScreen() {
    const { hostelId } = useAuth();
    const { colors } = useTheme();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'attendance' | 'entry_exit'>('attendance');
    const [residentCache, setResidentCache] = useState<{ [key: string]: { name: string, room: string } }>({});


    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.text },
        card: { backgroundColor: colors.card, borderColor: colors.border },
        subText: { color: colors.subText }
    };

    useEffect(() => {
        if (!hostelId) return;

        console.log(`[AttendanceLog] Initializing subscription for tab: ${activeTab}, hostel: ${hostelId}`);
        setLoading(true);

        const collectionName = activeTab === 'attendance' ? 'attendance' : 'entry_exit_logs';
        const q = query(
            collection(db, collectionName),
            where('hostelId', '==', hostelId),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, async (snapshot: QuerySnapshot) => {
            console.log(`[AttendanceLog] Snapshot update received for ${activeTab}. Docs: ${snapshot.size}`);

            const fetched: any[] = [];
            const uniqueResidentIds = new Set<string>();

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.residentId) uniqueResidentIds.add(data.residentId);

                let timeString = 'Unknown Time';
                if (data.timestamp) {
                    const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    timeString = date.toLocaleString();
                }

                fetched.push({ id: doc.id, ...data, timeString });
            });

            // Fetch details for new residents
            const newCache = { ...residentCache };
            let cacheUpdated = false;

            await Promise.all(Array.from(uniqueResidentIds).map(async (rid) => {
                if (!newCache[rid]) {
                    try {
                        const resDoc = await getDoc(doc(db, 'residents', rid));
                        if (resDoc.exists()) {
                            const resData = resDoc.data();
                            newCache[rid] = { name: resData.name, room: resData.roomNumber };
                            cacheUpdated = true;
                        }
                    } catch (e) {
                        console.warn(`[AttendanceLog] Failed to load resident ${rid}`, e);
                    }
                }
            }));

            if (cacheUpdated) {
                setResidentCache(newCache);
            }

            setLogs(fetched);
            setLoading(false);
        }, (error: FirestoreError) => {
            console.error(`[AttendanceLog] Subscription Error (${activeTab}):`, error);
            setLoading(false);
        });

        // Cleanup subscription on unmount or dependency change
        return () => unsubscribe();
    }, [hostelId, activeTab]);

    // Simplified manual refresh just in case (though onSnapshot handles updates)
    const handleRefresh = () => {
        // Since onSnapshot is active, this might just check loading state or could be removed.
        // For UI feedback, we can just toggle loading briefly.
        setLoading(true);
        setTimeout(() => setLoading(false), 500);
    };

    const renderItem = ({ item }: any) => {
        const details = residentCache[item.residentId];
        return (
            <View style={[styles.row, dynamicStyles.card]}>
                <View>
                    <Text style={[styles.residentId, dynamicStyles.text]}>
                        {details ? `${details.name} (Room: ${details.room})` : `ID: ${item.residentId || 'Unknown'}`}
                    </Text>
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
    };

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
                    onRefresh={handleRefresh}
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
