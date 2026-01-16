import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { sendPushNotification } from '../../utils/notificationUtils';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function AdminLeaveScreen() {
    const { hostelId } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'pending' | 'all'>('pending');

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            if (!hostelId) return;
            let q;
            if (filter === 'pending') {
                q = query(
                    collection(db, 'leaves'),
                    where('hostelId', '==', hostelId),
                    where('status', '==', 'pending_admin')
                );
            } else {
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
            const leafSnap = await getDoc(docRef);
            if (!leafSnap.exists()) {
                Alert.alert('Error', 'Leave record not found');
                return;
            }
            const leafData = leafSnap.data();
            const residentUid = leafData.userId;

            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            await updateDoc(docRef, { status: newStatus });

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
            case 'approved': return '#10B981';
            case 'pending_admin': return '#F59E0B';
            case 'rejected': return '#F43F5E';
            default: return colors.subText;
        }
    };

    const renderTabButton = (type: 'pending' | 'all', label: string) => {
        const isActive = filter === type;
        return (
            <TouchableOpacity
                style={[styles.tabButton, isActive && { backgroundColor: colors.primary }]}
                onPress={() => setFilter(type)}
            >
                <Text style={[styles.tabText, { color: isActive ? 'white' : colors.subText }]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }: any) => (
        <Card style={styles.card} variant="elevated">
            <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status.replace('_admin', '').toUpperCase()}
                    </Text>
                </View>
                <Text style={[styles.dateText, { color: colors.subText }]}>
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'N/A'}
                </Text>
            </View>

            <Text style={[styles.reason, { color: colors.text }]}>{item.reason}</Text>

            <View style={styles.detailBox}>
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>PERIOD</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                        {item.startDate} — {item.endDate}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>RESIDENT ID</Text>
                    <Text style={[styles.detailValue, { color: colors.subText, fontSize: 10 }]}>{item.userId}</Text>
                </View>
            </View>

            {item.status === 'pending_admin' && (
                <View style={styles.btnRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: '#F43F5E' }]}
                        onPress={() => handleAction(item.id, 'reject')}
                    >
                        <Text style={[styles.btnText, { color: '#F43F5E' }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => handleAction(item.id, 'approve')}
                    >
                        <Text style={[styles.btnText, { color: 'white' }]}>Approve</Text>
                    </TouchableOpacity>
                </View>
            )}
        </Card>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Leave Approvals" onBackPress={() => navigation.goBack()} />

            <View style={styles.tabsWrapper}>
                <View style={styles.tabContainer}>
                    {renderTabButton('pending', 'Pending Requests')}
                    {renderTabButton('all', 'All History')}
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={leaves}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📂</Text>
                            <Text style={[styles.emptyText, { color: colors.subText }]}>No leave records found</Text>
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
    tabsWrapper: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tabContainer: {
        flexDirection: 'row',
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    tabButton: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    tabText: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
    },
    list: {
        padding: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    card: {
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    statusText: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
    },
    dateText: {
        fontSize: Typography.size.xs,
    },
    reason: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.md,
    },
    detailBox: {
        backgroundColor: '#F9FAFB',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailLabel: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
    },
    detailValue: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.medium,
    },
    btnRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        borderWidth: 1.5,
    },
    btnText: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.bold,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    emptyText: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.medium,
    }
});

