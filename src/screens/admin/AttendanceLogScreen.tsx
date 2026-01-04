import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';

export default function AttendanceLogScreen() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'), limit(50));
            const querySnapshot = await getDocs(q);
            const fetched: any[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                let timeString = 'Unknown Time';
                if (data.timestamp) {
                    // Handle Firestore Timestamp or Date object
                    const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    timeString = date.toLocaleString();
                }

                fetched.push({ id: doc.id, ...data, timeString });
            });
            setLogs(fetched);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const renderItem = ({ item }: any) => (
        <View style={styles.row}>
            <View>
                <Text style={styles.userId}>{item.userId || 'Unknown User'}</Text>
                <Text style={styles.timestamp}>{item.timeString}</Text>
            </View>
            <Text style={[styles.type, { color: item.type === 'Entry' ? 'green' : 'red' }]}>
                {item.type}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Recent Activity (Last 50)</Text>
            {loading ? (
                <ActivityIndicator />
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    onRefresh={fetchLogs}
                    refreshing={loading}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        padding: 15,
        backgroundColor: '#f9f9f9',
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    list: {
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    userId: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    timestamp: {
        color: '#888',
        fontSize: 12,
    },
    type: {
        fontWeight: 'bold',
        fontSize: 16,
    }
});
