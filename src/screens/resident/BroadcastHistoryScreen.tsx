import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getRecentBroadcasts, Broadcast } from '../../services/firestoreService';

export default function BroadcastHistoryScreen() {
    const { hostelId } = useAuth();
    const { colors } = useTheme();
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState(true);

    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.text },
        card: { backgroundColor: colors.card, borderColor: colors.border },
    };

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
        <View style={[styles.card, dynamicStyles.card, item.priority === 'emergency' && styles.emergencyCard]}>
            <View style={styles.header}>
                <Text style={[styles.type, item.priority === 'emergency' ? styles.emergencyText : styles.normalText]}>
                    {item.priority === 'emergency' ? '🚨 EMERGENCY' : '📢 GENERAL'}
                </Text>
                <Text style={styles.date}>{item.createdAt?.toDate().toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.title, dynamicStyles.text]}>{item.title}</Text>
            <Text style={[styles.message, { color: colors.subText }]}>{item.message}</Text>
        </View>
    );

    return (
        <View style={[styles.container, dynamicStyles.container]}>
            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} />
            ) : (
                <FlatList
                    data={broadcasts}
                    keyExtractor={(item) => item.id!}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={[styles.empty, { color: colors.subText }]}>No broadcasts yet</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    list: {
        padding: 15,
    },
    card: {
        padding: 20,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        elevation: 2,
    },
    emergencyCard: {
        borderColor: '#d63031',
        borderLeftWidth: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    type: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    normalText: {
        color: '#007AFF',
    },
    emergencyText: {
        color: '#d63031',
    },
    date: {
        fontSize: 10,
        color: 'gray',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
    },
    empty: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    }
});
