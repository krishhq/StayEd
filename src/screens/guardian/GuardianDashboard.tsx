import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function GuardianDashboard({ navigation }: any) {
    const { signOut, user } = useAuth();
    const [wardName, setWardName] = useState('Loading...');
    const [attendanceCount, setAttendanceCount] = useState(0);
    const [pendingLeaves, setPendingLeaves] = useState(0);

    // Hardcoded Ward Logic for Demo
    // In a real app, we would query a 'guardians' collection to find { guardianId: user.uid, wardId: ... }
    // Here we just fetch *any* resident or a specific one for demo purposes.

    useEffect(() => {
        // Demo: Fetch stats for a "Mock Ward"
        // Ideally we would look for a resident linked to this guardian
        const fetchWardStats = async () => {
            try {
                // 1. Find a resident (just pick the first one found or a "Test Student")
                const qRes = query(collection(db, 'residents_data')); // Fetch all
                const snap = await getDocs(qRes);

                if (!snap.empty) {
                    const firstStudent = snap.docs[0].data();
                    setWardName(firstStudent.name || 'Test Ward');
                    // In real app, we'd use this student's UID to query logs
                } else {
                    setWardName('No Ward Linked');
                }

                // 2. Fetch Leaves (Mock query for "pending_guardian")
                // Since we don't have the ward's UID easily without the link, we show global pending for demo
                // OR we just show 0 if none.
                const qLeaves = query(collection(db, 'leaves'), where('status', '==', 'pending_guardian'));
                const snapLeaves = await getDocs(qLeaves);
                setPendingLeaves(snapLeaves.size);

            } catch (e) {
                console.log(e);
                setWardName('Demo Ward');
            }
        };

        fetchWardStats();
    }, []);

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
