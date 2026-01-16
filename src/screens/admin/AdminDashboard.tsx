import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebaseConfig';
import { collection, getCountFromServer, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { ATTENDANCE_SLOTS } from '../../utils/attendanceUtils';
import LoadingScreen from '../../components/LoadingScreen';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function AdminDashboard() {
    const { user, signOut, hostelId } = useAuth();
    const { colors, theme } = useTheme();
    const navigation = useNavigation<any>();
    const [residentCount, setResidentCount] = useState<number | string>('-');
    const [complaintCount, setComplaintCount] = useState<number | string>('-');
    const [alerts, setAlerts] = useState<any[]>([]);
    const [missedAttendance, setMissedAttendance] = useState<{ count: number, slotName: string, rawSlot: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchStats = async () => {
                if (!hostelId) return;
                setLoading(true);
                try {
                    try {
                        const qRes = query(collection(db, 'residents'), where("hostelId", "==", hostelId));
                        const resSnap = await getCountFromServer(qRes);
                        setResidentCount(resSnap.data().count);
                    } catch (err) { setResidentCount('!'); }

                    try {
                        const qComp = query(collection(db, 'complaints'), where("hostelId", "==", hostelId));
                        const compSnap = await getCountFromServer(qComp);
                        setComplaintCount(compSnap.data().count);
                    } catch (err) { setComplaintCount('!'); }

                    try {
                        const alertQ = query(collection(db, 'mess_alerts'), where('hostelId', '==', hostelId), orderBy('createdAt', 'desc'), limit(3));
                        const alertSnap = await getDocs(alertQ);
                        const fetchedAlerts: any[] = [];
                        alertSnap.forEach(doc => fetchedAlerts.push({ id: doc.id, ...doc.data() }));
                        setAlerts(fetchedAlerts);
                    } catch (err) { setAlerts([]); }

                    try {
                        const now = new Date();
                        const currentHour = now.getHours() + now.getMinutes() / 60;
                        let targetSlot: 'MORNING' | 'EVENING' | null = null;
                        let slotLabel = '';
                        if (currentHour > ATTENDANCE_SLOTS.EVENING.end) {
                            targetSlot = 'EVENING';
                            slotLabel = 'Evening Slot';
                        }
                        if (targetSlot && typeof residentCount === 'number') {
                            const startTime = new Date();
                            startTime.setHours(Math.floor(ATTENDANCE_SLOTS[targetSlot].start), (ATTENDANCE_SLOTS[targetSlot].start % 1) * 60, 0, 0);
                            const endTime = new Date();
                            endTime.setHours(Math.floor(ATTENDANCE_SLOTS[targetSlot].end), (ATTENDANCE_SLOTS[targetSlot].end % 1) * 60, 0, 0);
                            const attQ = query(collection(db, 'attendance'), where('hostelId', '==', hostelId), where('timestamp', '>=', Timestamp.fromDate(startTime)), where('timestamp', '<=', Timestamp.fromDate(endTime)));
                            const attSnap = await getDocs(attQ);
                            const uniqueResidents = new Set(attSnap.docs.map(doc => doc.data().residentId));
                            setMissedAttendance({ count: Math.max(0, residentCount - uniqueResidents.size), slotName: slotLabel, rawSlot: targetSlot });
                        } else { setMissedAttendance(null); }
                    } catch (err) { setMissedAttendance(null); }
                } finally { setLoading(false); }
            };
            fetchStats();
        }, [hostelId, residentCount])
    );

    if (loading) return <LoadingScreen message="Updating dashboard..." />;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader
                title="Warden Station"
                onProfilePress={() => navigation.navigate('Profile')}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.statsGrid}>
                    <Card style={styles.statCard}>
                        <Text style={[styles.statValue, { color: colors.primary }]}>{residentCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>REG. RESIDENTS</Text>
                    </Card>
                    <Card style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#F43F5E' }]}>{complaintCount}</Text>
                        <Text style={[styles.statLabel, { color: colors.subText }]}>OPEN TICKETS</Text>
                    </Card>
                </View>

                {(alerts.length > 0 || missedAttendance) && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Urgent Attention</Text>

                        {missedAttendance && missedAttendance.count > 0 && (
                            <Card
                                variant="elevated"
                                style={[styles.alertCard, { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }]}
                                onPress={() => navigation.navigate('AbsentResidents', { slotName: missedAttendance.slotName, targetSlot: missedAttendance.rawSlot })}
                            >
                                <View style={styles.alertHeader}>
                                    <View style={[styles.alertIconBg, { backgroundColor: '#F59E0B' }]}>
                                        <Text style={styles.alertIcon}>⚠️</Text>
                                    </View>
                                    <View>
                                        <Text style={[styles.alertTitle, { color: '#92400E' }]}>Attendance Gap Detected</Text>
                                        <Text style={[styles.alertSub, { color: '#B45309' }]}>{missedAttendance.slotName}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.alertMessage, { color: '#92400E' }]}>
                                    <Text style={{ fontWeight: 'bold' }}>{missedAttendance.count}</Text> residents have not marked their attendance for this slot.
                                </Text>
                            </Card>
                        )}

                        {alerts.map(alert => (
                            <Card key={alert.id} style={styles.msgCard} variant="outlined">
                                <View style={styles.msgHeader}>
                                    <Text style={[styles.msgTitle, { color: '#F43F5E' }]}>🚨 Mess Alert: {alert.title}</Text>
                                    <View style={[styles.dot, { backgroundColor: '#F43F5E' }]} />
                                </View>
                                <Text style={[styles.msgBody, { color: colors.text }]}>{alert.message}</Text>
                            </Card>
                        ))}
                    </View>
                )}

                <View style={[styles.section, { marginTop: Spacing.md }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Operations Hub</Text>
                    <View style={styles.toolsGrid}>
                        {[
                            { title: 'New Resident', icon: '👤', screen: 'RegisterResident', color: colors.primary },
                            { title: 'Triage Panel', icon: '🛠️', screen: 'AllComplaints', color: '#F59E0B' },
                            { title: 'Security Logs', icon: '🛡️', screen: 'AttendanceLog', color: '#10B981' },
                            { title: 'Leave Desk', icon: '📅', screen: 'AdminLeaves', color: '#6366F1' },
                            { title: 'Broadcast', icon: '📣', screen: 'AdminBroadcast', color: '#D946EF' },
                        ].map((tool, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.toolBtn, { backgroundColor: colors.card }]}
                                onPress={() => navigation.navigate(tool.screen)}
                            >
                                <View style={[styles.toolIconContainer, { backgroundColor: tool.color + '10' }]}>
                                    <Text style={[styles.toolIconText, { color: tool.color }]}>{tool.icon}</Text>
                                </View>
                                <Text style={[styles.toolTitle, { color: colors.text }]}>{tool.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                    <Text style={[styles.logoutText, { color: colors.subText }]}>Terminal Secure Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        borderRadius: BorderRadius.xl,
    },
    statValue: {
        fontSize: 32,
        fontWeight: Typography.weight.bold,
        letterSpacing: -1,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
        marginTop: 4,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.md,
        letterSpacing: 0.5,
    },
    alertCard: {
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    alertIconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertIcon: {
        fontSize: 18,
    },
    alertTitle: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.bold,
    },
    alertSub: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
    },
    alertMessage: {
        fontSize: Typography.size.sm,
        lineHeight: 20,
    },
    msgCard: {
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    msgHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    msgTitle: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 0.5,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    msgBody: {
        fontSize: Typography.size.sm,
        lineHeight: 20,
    },
    toolsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    toolBtn: {
        width: '47.6%', // Fixed width for 2-column grid
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        ...Shadows.sm,
    },
    toolIconContainer: {
        width: 54,
        height: 54,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    toolIconText: {
        fontSize: 24,
    },
    toolTitle: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
        textAlign: 'center',
    },
    logoutBtn: {
        marginTop: Spacing.xxl,
        alignItems: 'center',
        padding: Spacing.md,
    },
    logoutText: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
});


