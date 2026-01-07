import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { sendPushNotification } from '../../utils/notificationUtils';

export default function LeaveScreen() {
    const { user, hostelId, residentId } = useAuth();
    const [reason, setReason] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [latestLeave, setLatestLeave] = useState<any>(null);

    useEffect(() => {
        fetchLatestStatus();
    }, [residentId]);

    const fetchLatestStatus = async () => {
        if (!residentId) return;
        try {
            const q = query(
                collection(db, 'leaves'),
                where('residentId', '==', residentId),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                setLatestLeave({ id: snap.docs[0].id, ...snap.docs[0].data() });
            }
        } catch (error) {
            console.warn('[LeaveScreen] Error fetching status:', error);
            // Fallback: Fetch without orderBy if index missing
            const qFallback = query(collection(db, 'leaves'), where('residentId', '==', residentId));
            const snap = await getDocs(qFallback);
            if (!snap.empty) {
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                docs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                setLatestLeave(docs[0]);
            }
        }
    };

    const submitLeave = async () => {
        if (!reason || !startDate || !endDate) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (user && hostelId) {
                // 1. Submit leave request
                const leaveData = {
                    userId: user.uid,
                    residentId: residentId,
                    hostelId: hostelId,
                    reason,
                    startDate,
                    endDate,
                    status: 'pending_guardian',
                    createdAt: serverTimestamp(),
                };

                await addDoc(collection(db, 'leaves'), leaveData);

                // 2. Notify Guardian
                // Fetch resident's data directly using residentId
                let guardianPhone = '';
                let residentName = 'A resident';

                if (residentId) {
                    const residentDocRef = doc(db, 'residents', residentId);
                    const residentSnap = await getDoc(residentDocRef);
                    if (residentSnap.exists()) {
                        const resData = residentSnap.data();
                        guardianPhone = resData.guardianPhone;
                        residentName = resData.name;
                    }
                }

                if (guardianPhone) {
                    // Find guardian user with this phone
                    const guardianUserSnap = await getDocs(query(collection(db, 'users'), where('phone', '==', guardianPhone), where('role', '==', 'guardian')));

                    if (!guardianUserSnap.empty) {
                        const guardianToken = guardianUserSnap.docs[0].data().pushToken;
                        if (guardianToken) {
                            await sendPushNotification(
                                guardianToken,
                                'New Leave Request',
                                `Your ward ${residentName} has requested leave for ${startDate} to ${endDate}.`,
                                { type: 'leave_request' }
                            );
                        }
                    }
                }

                Alert.alert('Success', 'Leave Application Submitted and Guardian Notified!');
                setReason('');
                setStartDate('');
                setEndDate('');
                fetchLatestStatus();
            } else {
                console.log({ reason, startDate, endDate });
                Alert.alert('Dev Mode', 'Leave logged to console');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>Apply for Leave</Text>

            <Text style={styles.label}>Reason for Leave</Text>
            <TextInput
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Going home for festival"
            />

            <Text style={styles.label}>Start Date (DD/MM/YYYY)</Text>
            <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="25/12/2026"
            />

            <Text style={styles.label}>End Date (DD/MM/YYYY)</Text>
            <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="01/01/2027"
            />

            <View style={styles.btnContainer}>
                <Button title={loading ? "Submitting..." : "Submit Application"} onPress={submitLeave} disabled={loading} />
            </View>

            {latestLeave && (
                <View style={styles.statusSection}>
                    <Text style={styles.statusTitle}>Recent Application Status</Text>
                    <View style={styles.statusBar}>
                        <View style={[styles.statusStep, (latestLeave.status === 'pending_guardian' || latestLeave.status === 'pending_admin' || latestLeave.status === 'approved') && styles.stepActive]}>
                            <Text style={styles.stepIcon}>📝</Text>
                            <Text style={styles.stepLabel}>Applied</Text>
                        </View>
                        <View style={styles.stepLine} />
                        <View style={[styles.statusStep, (latestLeave.status === 'pending_admin' || latestLeave.status === 'approved') && styles.stepActive]}>
                            <Text style={styles.stepIcon}>🛡️</Text>
                            <Text style={styles.stepLabel}>Guardian</Text>
                        </View>
                        <View style={styles.stepLine} />
                        <View style={[styles.statusStep, latestLeave.status === 'approved' && styles.stepActive]}>
                            <Text style={styles.stepIcon}>🏢</Text>
                            <Text style={styles.stepLabel}>Admin</Text>
                        </View>
                    </View>

                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: latestLeave.status === 'approved' ? '#27ae60' : latestLeave.status === 'rejected' ? '#e74c3c' : '#f39c12' }
                    ]}>
                        <Text style={styles.statusBadgeText}>
                            {latestLeave.status === 'pending_guardian' && '🕒 Waiting for Guardian'}
                            {latestLeave.status === 'pending_admin' && '⏳ Approved by Guardian - Waiting for Admin'}
                            {latestLeave.status === 'approved' && '✅ Leave Finalized'}
                            {latestLeave.status === 'rejected' && '❌ Leave Rejected'}
                        </Text>
                    </View>

                    <View style={styles.leaveInfo}>
                        <Text style={styles.infoRow}>Reason: <Text style={{ fontWeight: 'normal' }}>{latestLeave.reason}</Text></Text>
                        <Text style={styles.infoRow}>Dates: <Text style={{ fontWeight: 'normal' }}>{latestLeave.startDate} - {latestLeave.endDate}</Text></Text>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    label: {
        fontWeight: 'bold',
        marginTop: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        marginTop: 5,
        backgroundColor: 'white',
    },
    btnContainer: {
        marginTop: 30,
        marginBottom: 30,
    },
    statusSection: {
        marginTop: 10,
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginBottom: 40,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#2c3e50',
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statusStep: {
        alignItems: 'center',
        opacity: 0.3,
    },
    stepActive: {
        opacity: 1,
    },
    stepIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    stepLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#34495e',
    },
    stepLine: {
        flex: 1,
        height: 2,
        backgroundColor: '#eee',
        marginHorizontal: 10,
        marginTop: -15,
    },
    statusBadge: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
    },
    statusBadgeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
    leaveInfo: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 15,
    },
    infoRow: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#7f8c8d',
        marginBottom: 5,
    }
});
