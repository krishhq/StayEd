import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, orderBy, limit, onSnapshot, QuerySnapshot, FirestoreError, getDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function AttendanceLogScreen() {
    const { hostelId } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'attendance' | 'entry_exit'>('attendance');
    const [residentCache, setResidentCache] = useState<{ [key: string]: { name: string, room: string } }>({});

    useEffect(() => {
        if (!hostelId) return;

        setLoading(true);
        const collectionName = activeTab === 'attendance' ? 'attendance' : 'entry_exit_logs';
        const q = query(
            collection(db, collectionName),
            where('hostelId', '==', hostelId),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, async (snapshot: QuerySnapshot) => {
            const fetched: any[] = [];
            const uniqueResidentIds = new Set<string>();

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.residentId) uniqueResidentIds.add(data.residentId);

                let timeString = 'Unknown';
                if (data.timestamp) {
                    const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    timeString = date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                }

                fetched.push({ id: doc.id, ...data, timeString });
            });

            const newCache = { ...residentCache };
            let cacheUpdated = false;

            await Promise.all(Array.from(uniqueResidentIds).map(async (rid) => {
                if (!newCache[rid]) {
                    try {
                        const resDoc = await getDoc(doc(db, 'residents', rid));
                        if (resDoc.exists()) {
                            const resData = resDoc.data();
                            newCache[rid] = { name: resData.name, room: resData.roomNumber };
                            cacheUpdated = true;
                        }
                    } catch (e) {
                        console.warn(`[AttendanceLog] Failed to load resident ${rid}`, e);
                    }
                }
            }));

            if (cacheUpdated) setResidentCache(newCache);
            setLogs(fetched);
            setLoading(false);
        }, (error: FirestoreError) => {
            console.error(`[AttendanceLog] Error:`, error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [hostelId, activeTab]);

    const handleRefresh = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 500);
    };

    const renderTabButton = (type: 'attendance' | 'entry_exit', label: string) => {
        const isActive = activeTab === type;
        return (
            <TouchableOpacity
                style={[styles.tabButton, isActive && { backgroundColor: colors.primary }]}
                onPress={() => setActiveTab(type)}
            >
                <Text style={[styles.tabText, { color: isActive ? 'white' : colors.subText }]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }: any) => {
        const details = residentCache[item.residentId];
        return (
            <Card style={styles.card} variant="elevated">
                <View style={styles.logInfo}>
                    <Text style={[styles.name, { color: colors.text }]}>
                        {details ? details.name : 'Unknown Resident'}
                    </Text>
                    <View style={styles.metaRow}>
                        {details && (
                            <Text style={[styles.roomBadge, { backgroundColor: colors.background, color: colors.subText }]}>
                                Room {details.room}
                            </Text>
                        )}
                        <Text style={[styles.timeText, { color: colors.subText }]}>{item.timeString}</Text>
                    </View>
                    {activeTab === 'attendance' && item.distance !== undefined && (
                        <Text style={[styles.distanceText, { color: colors.subText }]}>
                            📍 {item.distance.toFixed(1)}m from center
                        </Text>
                    )}
                </View>

                <View style={styles.statusSection}>
                    {activeTab === 'attendance' ? (
                        <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
                            <Text style={[styles.badgeText, { color: '#10B981' }]}>PRESENT</Text>
                        </View>
                    ) : (
                        <View style={[styles.badge, { backgroundColor: (item.type === 'entry' ? '#3B82F6' : '#F43F5E') + '20' }]}>
                            <Text style={[styles.badgeText, { color: item.type === 'entry' ? '#3B82F6' : '#F43F5E' }]}>
                                {item.type?.toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>
            </Card>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Security Logs" onBackPress={() => navigation.goBack()} />

            <View style={styles.tabsWrapper}>
                <View style={styles.tabContainer}>
                    {renderTabButton('attendance', 'Daily Attendance')}
                    {renderTabButton('entry_exit', 'Entry/Exit')}
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    onRefresh={handleRefresh}
                    refreshing={loading}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📋</Text>
                            <Text style={[styles.emptyText, { color: colors.subText }]}>No activity logs yet</Text>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    logInfo: {
        flex: 1,
    },
    name: {
        fontSize: Typography.size.sm,
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
    timeText: {
        fontSize: Typography.size.xs,
    },
    distanceText: {
        fontSize: 10,
        fontStyle: 'italic',
    },
    statusSection: {
        marginLeft: Spacing.md,
    },
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        minWidth: 70,
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 10,
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

