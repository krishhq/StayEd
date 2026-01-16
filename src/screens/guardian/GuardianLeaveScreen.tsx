import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function GuardianLeaveScreen() {
    const { linkedResidentId } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaves = async () => {
        if (!linkedResidentId) return;
        setLoading(true);
        try {
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
            Alert.alert('Success', `Leave Request ${action === 'approve' ? 'Approved' : 'Rejected'}`);
            fetchLeaves();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const renderItem = ({ item }: any) => (
        <Card style={styles.card} variant="elevated">
            <View style={styles.cardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.typeText, { color: colors.primary }]}>LEAVE REQUEST</Text>
                </View>
                <Text style={[styles.statusTag, { color: colors.warning }]}>Pending Approval</Text>
            </View>

            <Text style={[styles.reason, { color: colors.text }]}>{item.reason}</Text>

            <View style={styles.dateSection}>
                <View style={styles.dateBox}>
                    <Text style={[styles.dateLabel, { color: colors.subText }]}>FROM</Text>
                    <Text style={[styles.dateValue, { color: colors.text }]}>{item.startDate}</Text>
                </View>
                <View style={[styles.dateDivider, { backgroundColor: colors.border }]} />
                <View style={styles.dateBox}>
                    <Text style={[styles.dateLabel, { color: colors.subText }]}>TO</Text>
                    <Text style={[styles.dateValue, { color: colors.text }]}>{item.endDate}</Text>
                </View>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.error + '40' }]}
                    onPress={() => handleAction(item.id, 'reject')}
                >
                    <Text style={[styles.actionText, { color: colors.error }]}>DECLINE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleAction(item.id, 'approve')}
                >
                    <Text style={styles.approveText}>APPROVE</Text>
                </TouchableOpacity>
            </View>
        </Card>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Leave Approvals" onBackPress={() => navigation.goBack()} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={leaves}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={{ fontSize: 40, marginBottom: 10 }}>✨</Text>
                            <Text style={[styles.emptyText, { color: colors.subText }]}>No pending leave requests for your ward.</Text>
                        </View>
                    }
                    onRefresh={fetchLeaves}
                    refreshing={loading}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    list: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    card: {
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.xl,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    typeText: {
        fontSize: 9,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
    },
    statusTag: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
    },
    reason: {
        fontSize: 16,
        fontWeight: Typography.weight.semibold,
        lineHeight: 24,
        marginBottom: Spacing.lg,
    },
    dateSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xl,
    },
    dateBox: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 8,
        fontWeight: Typography.weight.bold,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    dateValue: {
        fontSize: 13,
        fontWeight: Typography.weight.semibold,
    },
    dateDivider: {
        width: 1,
        height: 20,
        marginHorizontal: Spacing.md,
    },
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    actionBtn: {
        flex: 1,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
    },
    approveBtn: {
        borderWidth: 0,
        ...Shadows.sm,
    },
    actionText: {
        fontSize: 11,
        fontWeight: Typography.weight.bold,
        letterSpacing: 0.5,
    },
    approveText: {
        fontSize: 11,
        fontWeight: Typography.weight.bold,
        letterSpacing: 0.5,
        color: 'white',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: Spacing.xxl,
    },
    emptyText: {
        fontSize: Typography.size.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
});

