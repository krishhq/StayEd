import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { sendPushNotification } from '../../utils/notificationUtils';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function LeaveScreen() {
    const { user, hostelId, residentId } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();
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
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return '#10B981';
            case 'rejected': return '#F43F5E';
            case 'pending_admin': return '#3B82F6';
            default: return '#F59E0B';
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Leave Application" onBackPress={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Card style={styles.formCard}>
                    <Text style={[styles.formTitle, { color: colors.text }]}>Apply for Leave</Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.subText }]}>Reason for Leave</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="e.g. Going home for festival"
                            placeholderTextColor={colors.subText + '50'}
                        />
                    </View>

                    <View style={styles.dateRow}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={[styles.label, { color: colors.subText }]}>Start Date</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                value={startDate}
                                onChangeText={setStartDate}
                                placeholder="DD/MM/YYYY"
                                placeholderTextColor={colors.subText + '50'}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={[styles.label, { color: colors.subText }]}>End Date</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                value={endDate}
                                onChangeText={setEndDate}
                                placeholder="DD/MM/YYYY"
                                placeholderTextColor={colors.subText + '50'}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
                        onPress={submitLeave}
                        disabled={loading}
                    >
                        <Text style={styles.submitBtnText}>{loading ? "Processing..." : "Submit Application"}</Text>
                    </TouchableOpacity>
                </Card>

                {latestLeave && (
                    <Card style={styles.statusCard} variant="outlined">
                        <Text style={[styles.statusTitle, { color: colors.text }]}>Recent Application Status</Text>

                        <View style={styles.stepper}>
                            <View style={styles.stepperLine}>
                                <View style={[styles.progressLine, {
                                    backgroundColor: colors.primary,
                                    width: latestLeave.status === 'approved' ? '100%' : latestLeave.status === 'pending_admin' ? '50%' : '0%'
                                }]} />
                            </View>

                            <View style={styles.step}>
                                <View style={[styles.dot, (latestLeave.status === 'pending_guardian' || latestLeave.status === 'pending_admin' || latestLeave.status === 'approved') && { backgroundColor: colors.primary }]} />
                                <Text style={[styles.stepText, { color: colors.subText }]}>Applied</Text>
                            </View>
                            <View style={styles.step}>
                                <View style={[styles.dot, (latestLeave.status === 'pending_admin' || latestLeave.status === 'approved') && { backgroundColor: colors.primary }]} />
                                <Text style={[styles.stepText, { color: colors.subText }]}>Guardian</Text>
                            </View>
                            <View style={styles.step}>
                                <View style={[styles.dot, latestLeave.status === 'approved' && { backgroundColor: colors.primary }]} />
                                <Text style={[styles.stepText, { color: colors.subText }]}>Admin</Text>
                            </View>
                        </View>

                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(latestLeave.status) + '15' }]}>
                            <Text style={[styles.statusBadgeText, { color: getStatusColor(latestLeave.status) }]}>
                                {latestLeave.status === 'pending_guardian' && '🕒 Awaiting Guardian Approval'}
                                {latestLeave.status === 'pending_admin' && '⏳ Approved by Guardian - Awaiting Admin'}
                                {latestLeave.status === 'approved' && '✅ Leave Fully Approved'}
                                {latestLeave.status === 'rejected' && '❌ Leave Application Rejected'}
                            </Text>
                        </View>

                        <View style={[styles.leaveDetails, { borderTopColor: colors.border }]}>
                            <Text style={[styles.detailItem, { color: colors.subText }]}>
                                <Text style={styles.detailLabel}>Reason: </Text>{latestLeave.reason}
                            </Text>
                            <Text style={[styles.detailItem, { color: colors.subText }]}>
                                <Text style={styles.detailLabel}>Dates: </Text>{latestLeave.startDate} — {latestLeave.endDate}
                            </Text>
                        </View>
                    </Card>
                )}
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
    formCard: {
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    formTitle: {
        fontSize: Typography.size.lg,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.lg,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.xs,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        fontSize: Typography.size.md,
    },
    dateRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    submitBtn: {
        marginTop: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        ...Shadows.sm,
    },
    submitBtnText: {
        color: 'white',
        fontWeight: Typography.weight.bold,
        fontSize: Typography.size.md,
    },
    statusCard: {
        padding: Spacing.lg,
    },
    statusTitle: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.xl,
    },
    stepper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.xl,
        position: 'relative',
    },
    stepperLine: {
        position: 'absolute',
        top: 6,
        left: Spacing.xl + 6,
        right: Spacing.xl + 6,
        height: 2,
        backgroundColor: '#E5E7EB',
        zIndex: -1,
    },
    progressLine: {
        height: '100%',
    },
    step: {
        alignItems: 'center',
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#E5E7EB',
        marginBottom: Spacing.xs,
    },
    stepText: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
    },
    statusBadge: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    statusBadgeText: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
    },
    leaveDetails: {
        borderTopWidth: 1,
        paddingTop: Spacing.md,
    },
    detailItem: {
        fontSize: Typography.size.sm,
        marginBottom: 4,
    },
    detailLabel: {
        fontWeight: Typography.weight.bold,
    },
});

