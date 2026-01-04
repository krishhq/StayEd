import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function AllComplaintsScreen() {
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const fetched: any[] = [];
            querySnapshot.forEach((doc) => {
                fetched.push({ id: doc.id, ...doc.data() });
            });
            setComplaints(fetched);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch complaints');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const resolveComplaint = async (id: string, currentStatus: string) => {
        if (currentStatus === 'resolved') return;

        try {
            const docRef = doc(db, 'complaints', id);
            await updateDoc(docRef, { status: 'resolved' });
            Alert.alert('Success', 'Complaint marked as resolved');
            fetchComplaints(); // Refresh
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const renderItem = ({ item }: any) => (
        <View style={[styles.card, item.status === 'resolved' && styles.resolvedCard]}>
            <View style={styles.headerRow}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={[styles.status, { color: item.status === 'resolved' ? 'green' : 'orange' }]}>
                    {item.status.toUpperCase()}
                </Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>

            {item.status !== 'resolved' && (
                <TouchableOpacity
                    style={styles.resolveBtn}
                    onPress={() => resolveComplaint(item.id, item.status)}
                >
                    <Text style={styles.btnText}>Mark Resolved</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" />
            ) : (
                <FlatList
                    data={complaints}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No complaints found.</Text>}
                    onRefresh={fetchComplaints}
                    refreshing={loading}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    list: {
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        elevation: 2,
        borderLeftWidth: 5,
        borderLeftColor: 'orange',
    },
    resolvedCard: {
        borderLeftColor: 'green',
        opacity: 0.8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    category: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        backgroundColor: '#eee',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    status: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    description: {
        color: '#444',
        marginBottom: 10,
    },
    resolveBtn: {
        backgroundColor: '#007AFF',
        padding: 8,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 5,
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
    },
    empty: {
        textAlign: 'center',
        marginTop: 50,
        color: '#666',
    }
});
