import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebaseConfig';
import { collection, getCountFromServer, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function AdminDashboard({ navigation }: any) {
    const { user, signOut, hostelId } = useAuth(); // Added hostelId
    const { colors, theme, toggleTheme } = useTheme();
    const [residentCount, setResidentCount] = useState<number | string>('-');
    const [complaintCount, setComplaintCount] = useState<number | string>('-');
    const [alerts, setAlerts] = useState<any[]>([]);

    // Dynamic Styles
    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.text },
        card: { backgroundColor: colors.card, borderColor: colors.border },
        cardText: { color: colors.text },
        subText: { color: colors.subText },
    };

    // Refresh stats every time the dashboard is focused
    useFocusEffect(
        useCallback(() => {
            const fetchStats = async () => {
                if (!hostelId) {
                    console.log("[AdminDashboard] No hostelId, skipping fetch");
                    return;
                }

                console.log(`[AdminDashboard] Fetching stats for hostel: ${hostelId}`);
                try {
                    // Filter Residents by Hostel ID
                    const resCollection = collection(db, 'residents');
                    const qRes = query(resCollection, where("hostelId", "==", hostelId));
                    const resSnap = await getCountFromServer(qRes);
                    const rCount = resSnap.data().count;
                    setResidentCount(rCount);

                    // Filter Complaints by Hostel ID
                    const compCollection = collection(db, 'complaints');
                    const qComp = query(compCollection, where("hostelId", "==", hostelId));
                    const compSnap = await getCountFromServer(qComp);
                    const cCount = compSnap.data().count;
                    setComplaintCount(cCount);

                    console.log(`[AdminDashboard] Stats loaded: ${rCount} residents, ${cCount} complaints`);

                    // Mess Alerts
                    const alertQ = query(collection(db, 'mess_alerts'), orderBy('createdAt', 'desc'), limit(3));
                    const alertSnap = await getDocs(alertQ);
                    const fetchedAlerts: any[] = [];
                    alertSnap.forEach(doc => fetchedAlerts.push({ id: doc.id, ...doc.data() }));
                    setAlerts(fetchedAlerts);
                } catch (e) {
                    console.error('[AdminDashboard] Stats Error:', e);
                    setResidentCount(0);
                    setComplaintCount(0);
                }
            };

            fetchStats();
        }, [hostelId])
    );

    return (
        <ScrollView contentContainerStyle={[styles.container, dynamicStyles.container]}>
            <View style={styles.headerRow}>
                <Text style={[styles.title, dynamicStyles.text]}>Admin Dashboard</Text>
                <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
                    <Text style={{ fontSize: 22 }}>{theme === 'light' ? '🌙' : '☀️'}</Text>
                </TouchableOpacity>
            </View>

            {/* Stats Row */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, dynamicStyles.card]}>
                    <Text style={styles.statNumber}>{residentCount}</Text>
                    <Text style={[styles.statLabel, dynamicStyles.subText]}>Total Residents</Text>
                </View>
                <View style={[styles.statCard, dynamicStyles.card]}>
                    <Text style={styles.statNumber}>{complaintCount}</Text>
                    <Text style={[styles.statLabel, dynamicStyles.subText]}>Total Complaints</Text>
                </View>
            </View>

            {/* Alerts */}
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

            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Manage & Monitor</Text>

            <View style={styles.grid}>
                <TouchableOpacity style={[styles.card, dynamicStyles.card]} onPress={() => navigation.navigate('RegisterResident')}>
                    <Text style={styles.icon}>👤</Text>
                    <Text style={[styles.cardText, dynamicStyles.cardText]}>Register Resident</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.card, dynamicStyles.card]} onPress={() => navigation.navigate('AllComplaints')}>
                    <Text style={styles.icon}>⚠️</Text>
                    <Text style={[styles.cardText, dynamicStyles.cardText]}>View Complaints</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.card, dynamicStyles.card]} onPress={() => navigation.navigate('AttendanceLog')}>
                    <Text style={styles.icon}>📋</Text>
                    <Text style={[styles.cardText, dynamicStyles.cardText]}>Attendance Logs</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.card, dynamicStyles.card]} onPress={() => navigation.navigate('AdminLeaves')}>
                    <Text style={styles.icon}>✈️</Text>
                    <Text style={[styles.cardText, dynamicStyles.cardText]}>View Leaves</Text>
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
        minHeight: '100%',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    iconBtn: {
        backgroundColor: 'rgba(150,150,150,0.2)',
        padding: 8,
        borderRadius: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statCard: {
        width: '48%',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    statLabel: {
        fontSize: 12,
    },
    alertSection: {
        marginBottom: 20,
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
        padding: 20,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
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
        marginBottom: 30,
    },
    logoutText: {
        color: 'red',
        fontWeight: 'bold',
    }
});
