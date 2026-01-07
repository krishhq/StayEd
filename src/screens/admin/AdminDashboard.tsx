import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebaseConfig';
import { collection, getCountFromServer, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { ATTENDANCE_SLOTS } from '../../utils/attendanceUtils';

export default function AdminDashboard({ navigation }: any) {
    const { user, signOut, hostelId } = useAuth(); // Added hostelId
    const { colors, theme, toggleTheme } = useTheme();
    const [residentCount, setResidentCount] = useState<number | string>('-');
    const [complaintCount, setComplaintCount] = useState<number | string>('-');
    const [alerts, setAlerts] = useState<any[]>([]);
    const [missedAttendance, setMissedAttendance] = useState<{ count: number, slotName: string } | null>(null);

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
                    // 1. Resident Count (Isolated)
                    try {
                        const resCollection = collection(db, 'residents');
                        const qRes = query(resCollection, where("hostelId", "==", hostelId));
                        const resSnap = await getCountFromServer(qRes);
                        setResidentCount(resSnap.data().count);
                    } catch (err) {
                        console.error('[AdminDashboard] Resident Count Error:', err);
                        setResidentCount('Error');
                    }

                    // 2. Complaint Count (Isolated)
                    try {
                        const compCollection = collection(db, 'complaints');
                        const qComp = query(compCollection, where("hostelId", "==", hostelId));
                        const compSnap = await getCountFromServer(qComp);
                        setComplaintCount(compSnap.data().count);
                    } catch (err) {
                        console.error('[AdminDashboard] Complaint Count Error:', err);
                        setComplaintCount('Error');
                    }

                    // 3. Mess Alerts (Isolated with client-side sort fallback)
                    try {
                        const alertCollection = collection(db, 'mess_alerts');
                        const alertQ = query(
                            alertCollection,
                            where('hostelId', '==', hostelId),
                            orderBy('createdAt', 'desc'),
                            limit(3)
                        );

                        try {
                            const alertSnap = await getDocs(alertQ);
                            const fetchedAlerts: any[] = [];
                            alertSnap.forEach(doc => fetchedAlerts.push({ id: doc.id, ...doc.data() }));
                            setAlerts(fetchedAlerts);
                        } catch (indexError) {
                            console.warn('[AdminDashboard] Alerts index missing, falling back to client-side filter/sort');
                            // Fallback: Fetch without orderBy to avoid index requirement
                            const alertQFallback = query(alertCollection, where('hostelId', '==', hostelId));
                            const alertSnap = await getDocs(alertQFallback);
                            const fetchedAlerts: any[] = [];
                            alertSnap.forEach(doc => fetchedAlerts.push({ id: doc.id, ...doc.data() }));

                            // Sort and limit on client
                            const sorted = fetchedAlerts.sort((a, b) =>
                                (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
                            ).slice(0, 3);
                            setAlerts(sorted);
                        }
                    } catch (err) {
                        console.error('[AdminDashboard] Mess Alerts Error:', err);
                        setAlerts([]);
                    }

                    // 4. Post-Slot Attendance Report (Isolated)
                    try {
                        const now = new Date();
                        const currentHour = now.getHours() + now.getMinutes() / 60;
                        let targetSlot: 'MORNING' | 'EVENING' | null = null;
                        let slotLabel = '';

                        if (currentHour > ATTENDANCE_SLOTS.EVENING.end) {
                            targetSlot = 'EVENING';
                            slotLabel = 'Evening (8:00 PM - 9:30 PM)';
                        } else if (currentHour > ATTENDANCE_SLOTS.MORNING.end) {
                            targetSlot = 'MORNING';
                            slotLabel = 'Morning (7:00 AM - 9:00 AM)';
                        }

                        if (targetSlot && typeof residentCount === 'number') {
                            const startTime = new Date();
                            startTime.setHours(Math.floor(ATTENDANCE_SLOTS[targetSlot].start), (ATTENDANCE_SLOTS[targetSlot].start % 1) * 60, 0, 0);
                            const endTime = new Date();
                            endTime.setHours(Math.floor(ATTENDANCE_SLOTS[targetSlot].end), (ATTENDANCE_SLOTS[targetSlot].end % 1) * 60, 0, 0);

                            const attQ = query(
                                collection(db, 'attendance'),
                                where('hostelId', '==', hostelId),
                                where('timestamp', '>=', Timestamp.fromDate(startTime)),
                                where('timestamp', '<=', Timestamp.fromDate(endTime))
                            );
                            const attSnap = await getDocs(attQ);
                            const uniqueResidents = new Set(attSnap.docs.map(doc => doc.data().residentId));
                            const attendedCount = uniqueResidents.size;
                            const missed = Math.max(0, residentCount - attendedCount);

                            setMissedAttendance({ count: missed, slotName: slotLabel });
                        } else {
                            setMissedAttendance(null);
                        }
                    } catch (err) {
                        console.error('[AdminDashboard] Attendance Report Error:', err);
                        setMissedAttendance(null);
                    }

                } catch (e: any) {
                    console.error('[AdminDashboard] Global Stats Error:', e);
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

            {/* Alerts & Reports Section */}
            {(alerts.length > 0 || missedAttendance) && (
                <View style={styles.reportSection}>
                    {missedAttendance && (
                        <View style={styles.attendanceReport}>
                            <Text style={styles.sectionHeader}>📈 Attendance Gap Report</Text>
                            <View style={styles.reportCard}>
                                <Text style={styles.reportMain}>
                                    <Text style={styles.reportHighlight}>{missedAttendance.count}</Text> Residents missed
                                </Text>
                                <Text style={styles.reportSub}>{missedAttendance.slotName}</Text>
                            </View>
                        </View>
                    )}

                    {alerts.length > 0 && (
                        <View style={[styles.alertSection, missedAttendance && { marginTop: 15 }]}>
                            <Text style={styles.sectionHeader}>🚨 Urgent Alerts</Text>
                            {alerts.map((alert) => (
                                <View key={alert.id} style={styles.alertCard}>
                                    <Text style={styles.alertTitle}>{alert.title}</Text>
                                    <Text style={styles.alertMsg}>{alert.message}</Text>
                                </View>
                            ))}
                        </View>
                    )}
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

                <TouchableOpacity style={[styles.card, dynamicStyles.card]} onPress={() => navigation.navigate('AdminBroadcast')}>
                    <Text style={styles.icon}>📢</Text>
                    <Text style={[styles.cardText, dynamicStyles.cardText]}>Send Broadcast / Notice</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
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
    reportSection: {
        marginBottom: 20,
    },
    attendanceReport: {
        backgroundColor: '#f1f2f6',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#dfe4ea',
    },
    reportCard: {
        marginTop: 5,
    },
    reportMain: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2f3542',
    },
    reportHighlight: {
        color: '#ff4757',
        fontSize: 22,
    },
    reportSub: {
        fontSize: 12,
        color: '#747d8c',
        marginTop: 2,
    },
    alertSection: {
        backgroundColor: '#fff0f0',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ffcccc',
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2f3542',
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
