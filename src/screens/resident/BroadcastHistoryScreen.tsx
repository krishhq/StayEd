import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getRecentBroadcasts, Broadcast } from '../../services/firestoreService';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function BroadcastHistoryScreen() {
    const { hostelId } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBroadcasts = async () => {
            if (!hostelId) return;
            try {
                const data = await getRecentBroadcasts(hostelId);
                setBroadcasts(data);
            } catch (error) {
                console.error('Error fetching broadcast history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBroadcasts();
    }, [hostelId]);

    const renderItem = ({ item }: { item: Broadcast }) => (
        <Card
            style={[styles.card, item.priority === 'emergency' && { borderColor: '#F43F5E', borderLeftWidth: 4 }]}
            variant="outlined"
        >
            <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: item.priority === 'emergency' ? '#F43F5E20' : colors.primary + '20' }]}>
                    <Text style={[styles.badgeText, { color: item.priority === 'emergency' ? '#F43F5E' : colors.primary }]}>
                        {item.priority === 'emergency' ? '🚨 EMERGENCY' : '📢 OFFICIAL'}
                    </Text>
                </View>
                <Text style={[styles.date, { color: colors.subText }]}>{item.createdAt?.toDate().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.message, { color: colors.subText }]}>{item.message}</Text>
        </Card>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Notices" onBackPress={() => navigation.goBack()} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={broadcasts}
                    keyExtractor={(item) => item.id!}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📭</Text>
                            <Text style={[styles.emptyText, { color: colors.subText }]}>No official notices yet</Text>
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 0.5,
    },
    date: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.medium,
    },
    title: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.xs,
    },
    message: {
        fontSize: Typography.size.sm,
        lineHeight: 20,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        justifyContent: 'center',
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

