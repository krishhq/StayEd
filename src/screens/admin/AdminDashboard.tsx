import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebaseConfig';
import { collection, getCountFromServer } from 'firebase/firestore';

export default function AdminDashboard({ navigation }: any) {
    const { signOut } = useAuth();
    const [residentCount, setResidentCount] = useState<number | string>('-');
    const [complaintCount, setComplaintCount] = useState<number | string>('-');

    useEffect(() => {
        // Fetch Basic Stats
        const fetchStats = async () => {
            try {
                // In simulation mode or simple setup, these collections might be empty, so we wrap in try/catch safely
                const resCollection = collection(db, 'residents_data');
                if (resCollection) {
                    const resSnap = await getCountFromServer(resCollection);
                    setResidentCount(resSnap.data().count);
                }

                const compCollection = collection(db, 'complaints');
                if (compCollection) {
                    const compSnap = await getCountFromServer(compCollection);
                    setComplaintCount(compSnap.data().count);
                }
            } catch (e) {
                console.log('Stats Error (Expected in Dev Mode if Indexes missing):', e);
                // Fallback for visual confirmation
                setResidentCount(0);
                setComplaintCount(0);
            }
        };

        fetchStats();
    }, []);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Admin Dashboard</Text>

            {/* Stats Row */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{residentCount}</Text>
                    <Text style={styles.statLabel}>Total Residents</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{complaintCount}</Text>
                    <Text style={styles.statLabel}>Total Complaints</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Manage & Monitor</Text>

            <View style={styles.grid}>
                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RegisterResident')}>
                    <Text style={styles.icon}>👤</Text>
                    <Text style={styles.cardText}>Register Resident</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AllComplaints')}>
                    <Text style={styles.icon}>⚠️</Text>
                    <Text style={styles.cardText}>View Complaints</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AttendanceLog')}>
                    <Text style={styles.icon}>📋</Text>
                    <Text style={styles.cardText}>Attendance Logs</Text>
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
        backgroundColor: '#fff',
        minHeight: '100%',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        marginTop: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    statCard: {
        backgroundColor: '#f8f9fa',
        width: '48%',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    statLabel: {
        color: '#666',
        fontSize: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15,
    },
    card: {
        width: '100%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        elevation: 2,
    },
    icon: {
        fontSize: 24,
        marginRight: 20,
    },
    cardText: {
        fontSize: 16,
        fontWeight: '500',
    },
    logoutBtn: {
        marginTop: 40,
        alignSelf: 'center',
        padding: 10,
    },
    logoutText: {
        color: 'red',
        fontWeight: 'bold',
    }
});
