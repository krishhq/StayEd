import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { ATTENDANCE_SLOTS } from '../../utils/attendanceUtils';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function AbsentResidentsScreen({ route }: any) {
    const { slotName, targetSlot } = route.params;
    const { hostelId } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();

    const [absentResidents, setAbsentResidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAbsentResidents();
    }, [hostelId, targetSlot]);

    const fetchAbsentResidents = async () => {
        setLoading(true);
        try {
            if (!hostelId) return;

            const residentsRef = collection(db, 'residents');
            const resQ = query(
                residentsRef,
                where("hostelId", "==", hostelId),
                where("status", "==", "active")
            );
            const resSnap = await getDocs(resQ);
            const allResidents: any[] = [];
            resSnap.forEach(doc => {
                allResidents.push({ id: doc.id, ...doc.data() });
            });

            let startHour = 0, endHour = 0;
            if (targetSlot === 'EVENING') {
                startHour = ATTENDANCE_SLOTS.EVENING.start;
                endHour = ATTENDANCE_SLOTS.EVENING.end;
            }

            const start = new Date();
            start.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);

            const end = new Date();
            end.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);

            const attendanceRef = collection(db, 'attendance');
            const attQ = query(
                attendanceRef,
                where('hostelId', '==', hostelId),
                where('timestamp', '>=', Timestamp.fromDate(start)),
                where('timestamp', '<=', Timestamp.fromDate(end))
            );

            const attSnap = await getDocs(attQ);
            const attendedIds = new Set<string>();
            attSnap.forEach(doc => {
                attendedIds.add(doc.data().residentId);
            });

            const absentList = allResidents.filter(r => !attendedIds.has(r.id));
            setAbsentResidents(absentList);

        } catch (error) {
            console.error("Error fetching absent residents:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phoneNumber: string) => {
        if (phoneNumber) {
            Linking.openURL(`tel:${phoneNumber}`);
        }
    };

    const renderItem = ({ item }: any) => (
        <Card style={styles.card} variant="elevated">
            <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <View style={styles.metaRow}>
                    <Text style={[styles.roomBadge, { backgroundColor: colors.background, color: colors.subText }]}>
                        Room {item.roomNumber || 'N/A'}
                    </Text>
                    <Text style={[styles.phoneText, { color: colors.subText }]}>{item.phone}</Text>
                </View>
                {item.guardianName && (
                    <Text style={[styles.guardianInfo, { color: colors.subText }]}>
                        Guardian: {item.guardianName}
                    </Text>
                )}
            </View>
            <View style={styles.actionGroup}>
                <TouchableOpacity
                    style={[styles.callBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleCall(item.phone)}
                >
                    <Text style={styles.callIcon}>📱</Text>
                </TouchableOpacity>
                {item.guardianPhone && (
                    <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: '#F59E0B' }]}
                        onPress={() => handleCall(item.guardianPhone)}
                    >
                        <Text style={styles.callIcon}>🏡</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Card>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title={`Absent: ${slotName}`} onBackPress={() => navigation.goBack()} />

            <View style={[styles.statsBar, { borderBottomColor: colors.border }]}>
                <Text style={[styles.statsText, { color: colors.subText }]}>
                    <Text style={{ fontWeight: 'bold', color: colors.text }}>{absentResidents.length}</Text> residents missing
                </Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={absentResidents}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>🎉</Text>
                            <Text style={[styles.emptyText, { color: colors.subText }]}>Everyone is present!</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    statsBar: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    statsText: {
        fontSize: Typography.size.sm,
    },
    list: {
        padding: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: 4,
    },
    roomBadge: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
    },
    phoneText: {
        fontSize: Typography.size.xs,
    },
    guardianInfo: {
        fontSize: 10,
        fontStyle: 'italic',
    },
    actionGroup: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    callBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    callIcon: {
        fontSize: 18,
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

