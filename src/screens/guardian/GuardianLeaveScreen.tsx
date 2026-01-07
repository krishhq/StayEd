import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

export default function GuardianLeaveScreen() {
    const { linkedResidentId } = useAuth();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            if (!linkedResidentId) return;
            const q = query(
                collection(db, 'leaves'),
                where('residentId', '==', linkedResidentId),
                where('status', '==', 'pending_guardian')
            );
            const querySnapshot = await getDocs(q);
            const fetched: any[] = [];
            querySnapshot.forEach((doc) => {
                fetched.push({ id: doc.id, ...doc.data() });
            });
            setLeaves(fetched);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch leaves');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, []);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const docRef = doc(db, 'leaves', id);
            const newStatus = action === 'approve' ? 'pending_admin' : 'rejected';
            await updateDoc(docRef, { status: newStatus });
            Alert.alert('Success', `Leave ${action}d`);
            fetchLeaves();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const renderItem = ({ item }: any) => (
        <View style={styles.card}>
            <Text style={styles.reason}>{item.reason}</Text>
            <Text style={styles.dates}>From: {item.startDate} To: {item.endDate}</Text>

            <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleAction(item.id, 'reject')}>
                    <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleAction(item.id, 'approve')}>
                    <Text style={styles.btnText}>Approve</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Pending Approvals</Text>
            {loading ? (
                <ActivityIndicator />
            ) : (
                <FlatList
                    data={leaves}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListEmptyComponent={<Text style={styles.empty}>No pending leave requests.</Text>}
                    onRefresh={fetchLeaves}
                    refreshing={loading}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    card: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        elevation: 2,
    },
    reason: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    dates: {
        color: '#666',
        marginBottom: 15,
    },
    btnRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    btn: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
    approveBtn: {
        backgroundColor: 'green',
    },
    rejectBtn: {
        backgroundColor: 'red',
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
    },
    empty: {
        textAlign: 'center',
        marginTop: 40,
        color: '#999',
    }
});
