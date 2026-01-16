import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getComplaintsByHostel, updateComplaintStatus, Complaint } from '../../services/firestoreService';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

type StatusFilter = 'all' | 'pending' | 'in-progress' | 'resolved';

export default function AllComplaintsScreen() {
    const { hostelId } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [adminNotes, setAdminNotes] = useState('');

    const fetchComplaints = async () => {
        if (!hostelId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const filter = statusFilter === 'all' ? undefined : statusFilter;
            const fetched = await getComplaintsByHostel(hostelId, filter);
            setComplaints(fetched);
        } catch (error: any) {
            console.error("[AllComplaints] Error:", error);
            Alert.alert('Error', 'Failed to fetch complaints');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchComplaints();
        }, [hostelId, statusFilter])
    );

    const handleStatusUpdate = async (complaintId: string, newStatus: 'pending' | 'in-progress' | 'resolved') => {
        try {
            await updateComplaintStatus(complaintId, newStatus, adminNotes || undefined);
            Alert.alert('Success', `Complaint marked as ${newStatus}`);
            setSelectedComplaint(null);
            setAdminNotes('');
            await fetchComplaints();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const openDetailModal = (complaint: Complaint) => {
        setSelectedComplaint(complaint);
        setAdminNotes(complaint.adminNotes || '');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#F59E0B';
            case 'in-progress': return '#3B82F6';
            case 'resolved': return '#10B981';
            default: return '#6B7280';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'in-progress': return 'In Progress';
            default: return status.charAt(0).toUpperCase() + status.slice(1);
        }
    };

    const renderTabButton = (filter: StatusFilter, label: string) => {
        const isActive = statusFilter === filter;
        return (
            <TouchableOpacity
                style={[styles.tabButton, isActive && { backgroundColor: colors.primary }]}
                onPress={() => setStatusFilter(filter)}
            >
                <Text style={[styles.tabText, { color: isActive ? 'white' : colors.subText }]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }: { item: Complaint }) => (
        <Card style={styles.card} onPress={() => openDetailModal(item)} variant="elevated">
            <View style={styles.cardHeader}>
                <View style={styles.residentInfo}>
                    <Text style={[styles.residentName, { color: colors.text }]}>{item.residentName}</Text>
                    <Text style={[styles.date, { color: colors.subText }]}>
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'N/A'}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
                </View>
            </View>

            <View style={styles.metaRow}>
                <View style={[styles.categoryBadge, { backgroundColor: colors.background }]}>
                    <Text style={[styles.categoryText, { color: colors.subText }]}>📁 {item.category}</Text>
                </View>
                {item.priority === 'high' && (
                    <View style={[styles.priorityBadge, { backgroundColor: '#F43F5E20' }]}>
                        <Text style={[styles.priorityText, { color: '#F43F5E' }]}>Critical</Text>
                    </View>
                )}
            </View>

            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.description, { color: colors.subText }]} numberOfLines={2}>{item.description}</Text>
        </Card>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Complaints Registry" onBackPress={() => navigation.goBack()} />

            <View style={styles.tabsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
                    {renderTabButton('all', 'All')}
                    {renderTabButton('pending', 'Pending')}
                    {renderTabButton('in-progress', 'In Progress')}
                    {renderTabButton('resolved', 'Resolved')}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={complaints}
                    keyExtractor={(item) => item.id || ''}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>✅</Text>
                            <Text style={[styles.emptyText, { color: colors.subText }]}>No complaints to show</Text>
                        </View>
                    }
                    refreshing={loading}
                    onRefresh={fetchComplaints}
                />
            )}

            <Modal
                visible={selectedComplaint !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedComplaint(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        {selectedComplaint && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.modalHeader}>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedComplaint.status) + '20' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(selectedComplaint.status) }]}>{getStatusLabel(selectedComplaint.status)}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedComplaint(null)} style={styles.closeIcon}>
                                        <Text style={{ color: colors.subText, fontSize: 20 }}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedComplaint.title}</Text>
                                <Text style={[styles.modalDesc, { color: colors.subText }]}>{selectedComplaint.description}</Text>

                                <View style={[styles.detailSection, { borderTopColor: colors.border }]}>
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: colors.subText }]}>RESIDENT</Text>
                                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedComplaint.residentName}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: colors.subText }]}>CATEGORY</Text>
                                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedComplaint.category}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: colors.subText }]}>PRIORITY</Text>
                                        <Text style={[styles.detailValue, { color: selectedComplaint.priority === 'high' ? '#F43F5E' : colors.text }]}>{selectedComplaint.priority.toUpperCase()}</Text>
                                    </View>
                                </View>

                                <View style={styles.notesSection}>
                                    <Text style={[styles.detailLabel, { color: colors.subText }]}>ADMIN RESOLUTION NOTES</Text>
                                    <TextInput
                                        style={[styles.notesInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                        value={adminNotes}
                                        onChangeText={setAdminNotes}
                                        placeholder="Add private notes or resolution details..."
                                        placeholderTextColor={colors.subText + '50'}
                                        multiline
                                        numberOfLines={4}
                                    />
                                </View>

                                <View style={styles.actionSection}>
                                    <Text style={[styles.detailLabel, { color: colors.subText, marginBottom: Spacing.sm }]}>UPDATE STATUS</Text>
                                    <View style={styles.statusGrid}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { borderColor: '#F59E0B' }]}
                                            onPress={() => handleStatusUpdate(selectedComplaint.id!, 'pending')}
                                        >
                                            <Text style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: 12 }}>PENDING</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { borderColor: '#3B82F6' }]}
                                            onPress={() => handleStatusUpdate(selectedComplaint.id!, 'in-progress')}
                                        >
                                            <Text style={{ color: '#3B82F6', fontWeight: 'bold', fontSize: 12 }}>IN PROGRESS</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { borderColor: '#10B981', backgroundColor: '#10B98110' }]}
                                            onPress={() => handleStatusUpdate(selectedComplaint.id!, 'resolved')}
                                        >
                                            <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 12 }}>RESOLVE</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
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
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },
    tabButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: '#F3F4F6',
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
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    residentInfo: {
        flex: 1,
    },
    residentName: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.bold,
    },
    date: {
        fontSize: Typography.size.xs,
        marginTop: 2,
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
    metaRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    categoryBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: Typography.weight.medium,
    },
    priorityBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
    },
    title: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.xs,
    },
    description: {
        fontSize: Typography.size.sm,
        lineHeight: 20,
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.xl,
        minHeight: '60%',
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    closeIcon: {
        padding: 4,
    },
    modalTitle: {
        fontSize: Typography.size.xl,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.md,
    },
    modalDesc: {
        fontSize: Typography.size.md,
        lineHeight: 24,
        marginBottom: Spacing.xl,
    },
    detailSection: {
        borderTopWidth: 1,
        paddingVertical: Spacing.lg,
        gap: Spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailLabel: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
    },
    detailValue: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.medium,
    },
    notesSection: {
        marginBottom: Spacing.xl,
    },
    notesInput: {
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginTop: Spacing.sm,
        fontSize: Typography.size.sm,
        textAlignVertical: 'top',
    },
    actionSection: {
        marginBottom: Spacing.xxl,
    },
    statusGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderWidth: 1.5,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    }
});

