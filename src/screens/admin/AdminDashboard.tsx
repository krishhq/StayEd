import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebaseConfig';
import { collection, getCountFromServer, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function AdminDashboard({ navigation }: any) {
    const { signOut } = useAuth();
    const [residentCount, setResidentCount] = useState<number | string>('-');
    const [complaintCount, setComplaintCount] = useState<number | string>('-');
    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
        // Fetch Basic Stats
        const fetchStats = async () => {
            try {
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

                // Fetch Mess Alerts (Last 3)
                const alertQ = query(collection(db, 'mess_alerts'), orderBy('createdAt', 'desc'), limit(3));
                const alertSnap = await getDocs(alertQ);
                const fetchedAlerts: any[] = [];
                alertSnap.forEach(doc => fetchedAlerts.push({ id: doc.id, ...doc.data() }));
                setAlerts(fetchedAlerts);

            } catch (e) {
                console.log('Stats Error:', e);
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

            {/* Mess Alerts Section */}
            {alerts.length > 0 && (
                <View style={styles.alertSection}>
                    <Text style={styles.sectionHeader}>🚨 Urgent Alerts</Text>
                    {alerts.map((alert) => (
                        <View key={alert.id} style={styles.alertCard}>
                            <Text style={styles.alertTitle}>{alert.title}</Text>
                            <Text style={styles.alertMsg}>{alert.message}</Text>
                        </View>
                    ))}
                </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Manage & Monitor</Text>

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

                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AdminLeaves')}>
                    <Text style={styles.icon}>✈️</Text>
                    <Text style={styles.cardText}>View Leaves</Text>
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
        marginBottom: 20,
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
    alertSection: {
        marginBottom: 10,
        backgroundColor: '#fff0f0',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ffcccc',
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#d63031',
        marginBottom: 10,
    },
    alertCard: {
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 5,
    },
    alertTitle: {
        fontWeight: 'bold',
        color: '#c0392b',
    },
    alertMsg: {
        fontSize: 13,
        color: '#2c3e50',
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
