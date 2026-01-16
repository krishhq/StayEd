import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { Broadcast } from '../../services/firestoreService';
import LoadingScreen from '../../components/LoadingScreen';

import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function ResidentDashboard({ navigation }: any) {
    const { signOut, hostelId } = useAuth();
    const { colors, theme, toggleTheme } = useTheme();
    const [latestBroadcast, setLatestBroadcast] = React.useState<Broadcast | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!hostelId) return;

        let unsubscribeOuter: () => void;

        const startListener = (useOrderBy: boolean) => {
            const broadcastsRef = collection(db, 'broadcasts');
            const q = useOrderBy ? query(
                broadcastsRef,
                where('hostelId', '==', hostelId),
                orderBy('createdAt', 'desc'),
                limit(1)
            ) : query(
                broadcastsRef,
                where('hostelId', '==', hostelId)
            );

            return onSnapshot(q, (snapshot) => {
                if (snapshot.empty) {
                    setLatestBroadcast(null);
                    setLoading(false);
                    return;
                }

                const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Broadcast));
                if (!useOrderBy) {
                    docs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                }
                setLatestBroadcast(docs[0]);
                setLoading(false);
            }, (error) => {
                if (useOrderBy && error.code === 'failed-precondition') {
                    console.warn('[ResidentDashboard] Broadcast index missing, falling back to client-side sort');
                    unsubscribeOuter?.();
                    unsubscribeOuter = startListener(false);
                } else {
                    console.error('[ResidentDashboard] Broadcast listener error:', error);
                    setLoading(false);
                }
            });
        };

        unsubscribeOuter = startListener(true);
        return () => unsubscribeOuter?.();
    }, [hostelId]);

    if (loading) return <LoadingScreen message="Personalizing your dashboard..." />;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader
                title="Resident Home"
                onProfilePress={() => navigation.navigate('Profile')}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Welcome Message */}
                <View style={styles.welcomeSection}>
                    <Text style={[styles.welcomeText, { color: colors.text }]}>Welcome Back!</Text>
                    <Text style={[styles.subText, { color: colors.subText }]}>How can we help you today?</Text>
                </View>

                {/* Broadcast Banner */}
                {latestBroadcast && (
                    <Card
                        style={[
                            styles.broadcastBanner,
                            { backgroundColor: latestBroadcast.priority === 'emergency' ? colors.error : colors.primary }
                        ]}
                        onPress={() => navigation.navigate('BroadcastHistory')}
                    >
                        <View style={styles.broadcastHeader}>
                            <Text style={styles.broadcastType}>
                                {latestBroadcast.priority === 'emergency' ? '🚨 EMERGENCY' : '📢 LATEST NEWS'}
                            </Text>
                            <Text style={styles.viewHistory}>View All ➔</Text>
                        </View>
                        <Text style={styles.broadcastTitle}>{latestBroadcast.title}</Text>
                        <Text style={styles.broadcastMsg} numberOfLines={2}>{latestBroadcast.message}</Text>
                    </Card>
                )}

                <View style={styles.grid}>
                    {[
                        { title: 'Logs & Entry', icon: '📷', screen: 'Attendance', color: '#10B981' },
                        { title: 'Raise Issue', icon: '🔧', screen: 'Complaints', color: colors.warning },
                        { title: 'Forum', icon: '💬', screen: 'Forum', color: '#6366F1' },
                        { title: 'Apply Leave', icon: '📅', screen: 'Leave', color: '#F43F5E' },
                        { title: 'Mess Menu', icon: '🍛', screen: 'Mess', color: colors.primary },
                    ].map((item, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.menuCard, { backgroundColor: colors.card }, theme === 'light' ? Shadows.md : { borderWidth: 1, borderColor: colors.border }]}
                            onPress={() => navigation.navigate(item.screen)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                                <Text style={styles.cardIcon}>{item.icon}</Text>
                            </View>
                            <Text style={[styles.cardText, { color: colors.text }]}>{item.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
                    <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
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
    welcomeSection: {
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.xs,
    },
    welcomeText: {
        fontSize: Typography.size.xxl,
        fontWeight: Typography.weight.bold,
        letterSpacing: -0.5,
    },
    subText: {
        fontSize: Typography.size.sm,
        marginTop: 4,
    },
    broadcastBanner: {
        marginBottom: Spacing.xl,
        padding: Spacing.lg,
    },
    broadcastHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    broadcastType: {
        color: 'white',
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
        opacity: 0.9,
    },
    viewHistory: {
        color: 'white',
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.medium,
        opacity: 0.8,
    },
    broadcastTitle: {
        color: 'white',
        fontSize: Typography.size.lg,
        fontWeight: Typography.weight.bold,
        marginBottom: 4,
    },
    broadcastMsg: {
        color: 'white',
        fontSize: Typography.size.sm,
        opacity: 0.9,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    menuCard: {
        width: '47.5%',
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    cardIcon: {
        fontSize: 32,
    },
    cardText: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.semibold,
        textAlign: 'center',
    },
    logoutBtn: {
        marginTop: Spacing.xxl,
        alignItems: 'center',
        padding: Spacing.md,
    },
    logoutText: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
    },
});

