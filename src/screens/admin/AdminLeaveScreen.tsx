import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { sendPushNotification } from '../../utils/notificationUtils';

export default function AdminLeaveScreen() {
    const { hostelId } = useAuth();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'all'>('pending');

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            if (!hostelId) return;
            let q;
            if (filter === 'pending') {
                // Admin only sees what Guardian has approved (pending_admin)
                q = query(
                    collection(db, 'leaves'),
                    where('hostelId', '==', hostelId),
                    where('status', '==', 'pending_admin')
                );
            } else {
                // View history
                q = query(
                    collection(db, 'leaves'),
                    where('hostelId', '==', hostelId),
                    orderBy('createdAt', 'desc')
                );
            }

            const querySnapshot = await getDocs(q);
            const fetched: any[] = [];
            querySnapshot.forEach((doc) => {
                fetched.push({ id: doc.id, ...doc.data() });
            });
            setLeaves(fetched);
        } catch (error) {
            console.error(error);
            // Fallback if index missing
            setLeaves([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, [filter]);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const docRef = doc(db, 'leaves', id);

            // Fetch leaf data to get the resident's UID
            const leafSnap = await getDoc(docRef);
            if (!leafSnap.exists()) {
                Alert.alert('Error', 'Leave record not found');
                return;
            }
            const leafData = leafSnap.data();
            const residentUid = leafData.userId; // This is the UID for the resident

            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            await updateDoc(docRef, { status: newStatus });

            // Send notification to Resident
            if (residentUid) {
                const userDocRef = doc(db, 'users', residentUid);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const residentData = userSnap.data();
                    const token = residentData.pushToken;
                    if (token) {
                        await sendPushNotification(
                            token,
                            `Leave Application ${action === 'approve' ? 'Approved' : 'Rejected'}`,
                            `Admin has ${action}d your leave request from ${leafData.startDate} to ${leafData.endDate}.`,
                            { type: 'leave_status' }
                        );
                    }
                }
            }

            Alert.alert('Success', `Leave ${action}d`);
            fetchLeaves();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'green';
            case 'pending_admin': return 'orange';
            case 'rejected': return 'red';
            default: return 'gray';
        }
    };

    const renderItem = ({ item }: any) => (
        <View style={[styles.card, { borderLeftColor: getStatusColor(item.status) }]}>
            <View style={styles.header}>
                <Text style={styles.reason}>{item.reason}</Text>
                <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                    {item.status.toUpperCase()}
                </Text>
            </View>
            <Text style={styles.dates}>From: {item.startDate} To: {item.endDate}</Text>
            <Text style={styles.uid}>User ID: {item.userId}</Text>

            {item.status === 'pending_admin' && (
                <View style={styles.btnRow}>
                    <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleAction(item.id, 'reject')}>
                        <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleAction(item.id, 'approve')}>
                        <Text style={styles.btnText}>Final Approve</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Leave Approvals</Text>

            <View style={styles.filterContainer}>
                <TouchableOpacity onPress={() => setFilter('pending')} style={[styles.filterBtn, filter === 'pending' && styles.activeFilter]}>
                    <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>Pending Requests</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFilter('all')} style={[styles.filterBtn, filter === 'all' && styles.activeFilter]}>
                    <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All History</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator />
            ) : (
                <FlatList
                    data={leaves}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No records found.</Text>}
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
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    filterContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    filterBtn: {
        marginRight: 10,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#ddd',
    },
    activeFilter: {
        backgroundColor: '#007AFF',
    },
    filterText: {
        color: '#333',
    },
    activeFilterText: {
        color: 'white',
        fontWeight: 'bold',
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        elevation: 2,
        borderLeftWidth: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    reason: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    status: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    dates: {
        color: '#444',
        marginBottom: 5,
    },
    uid: {
        fontSize: 10,
        color: '#999',
        marginBottom: 10,
    },
    btnRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 5,
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
        marginTop: 50,
        color: '#888',
    }
});
