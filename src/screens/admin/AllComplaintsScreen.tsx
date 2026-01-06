import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, Button } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getComplaintsByHostel, updateComplaintStatus, Complaint } from '../../services/firestoreService';

type StatusFilter = 'all' | 'pending' | 'in-progress' | 'resolved';

export default function AllComplaintsScreen() {
    const { hostelId } = useAuth();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [adminNotes, setAdminNotes] = useState('');

    const fetchComplaints = async () => {
        if (!hostelId) {
            console.log("[AllComplaints] No hostelId available");
            setLoading(false);
            return;
        }

        console.log(`[AllComplaints] Fetching for hostel: ${hostelId}, filter: ${statusFilter}`);
        setLoading(true);
        try {
            const filter = statusFilter === 'all' ? undefined : statusFilter;
            const fetched = await getComplaintsByHostel(hostelId, filter);
            console.log(`[AllComplaints] Found ${fetched.length} complaints`);
            setComplaints(fetched);
        } catch (error: any) {
            console.error("[AllComplaints] Error:", error);
            Alert.alert('Error', 'Failed to fetch complaints');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
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
            case 'pending': return '#FFA500';
            case 'in-progress': return '#007AFF';
            case 'resolved': return '#34C759';
            default: return '#999';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'in-progress': return 'In Progress';
            default: return status.charAt(0).toUpperCase() + status.slice(1);
        }
    };

    const renderTabButton = (filter: StatusFilter, label: string, count?: number) => {
        const isActive = statusFilter === filter;
        return (
            <TouchableOpacity
                style={[styles.tabButton, isActive && styles.activeTab]}
                onPress={() => setStatusFilter(filter)}
            >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                    {label} {count !== undefined && `(${count})`}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }: { item: Complaint }) => (
        <TouchableOpacity style={styles.card} onPress={() => openDetailModal(item)}>
            <View style={styles.headerRow}>
                <Text style={styles.residentName}>👤 {item.residentName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                </View>
            </View>

            <View style={styles.categoryRow}>
                <Text style={styles.category}>📁 {item.category}</Text>
                <Text style={styles.priority}>
                    {item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢'} {item.priority}
                </Text>
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

            <Text style={styles.date}>
                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : 'Date N/A'}
            </Text>
        </TouchableOpacity>
    );

    const getCounts = () => {
        return {
            all: complaints.length,
            pending: complaints.filter(c => c.status === 'pending').length,
            inProgress: complaints.filter(c => c.status === 'in-progress').length,
            resolved: complaints.filter(c => c.status === 'resolved').length,
        };
    };

    const counts = getCounts();

    return (
        <View style={styles.container}>
            {/* Status Filter Tabs */}
            <View style={styles.tabContainer}>
                {renderTabButton('all', 'All', counts.all)}
                {renderTabButton('pending', 'Pending', counts.pending)}
                {renderTabButton('in-progress', 'In Progress', counts.inProgress)}
                {renderTabButton('resolved', 'Resolved', counts.resolved)}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={complaints}
                    keyExtractor={(item) => item.id || ''}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No complaints found.</Text>}
                    refreshing={loading}
                    onRefresh={fetchComplaints}
                />
            )}

            {/* Detail Modal */}
            <Modal
                visible={selectedComplaint !== null}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedComplaint(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedComplaint && (
                            <>
                                <Text style={styles.modalTitle}>Complaint Details</Text>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Resident:</Text>
                                    <Text style={styles.detailValue}>{selectedComplaint.residentName}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Category:</Text>
                                    <Text style={styles.detailValue}>{selectedComplaint.category}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Priority:</Text>
                                    <Text style={styles.detailValue}>{selectedComplaint.priority}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Status:</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedComplaint.status) }]}>
                                        <Text style={styles.statusText}>{getStatusLabel(selectedComplaint.status)}</Text>
                                    </View>
                                </View>

                                <Text style={styles.detailLabel}>Title:</Text>
                                <Text style={styles.modalDescription}>{selectedComplaint.title}</Text>

                                <Text style={styles.detailLabel}>Description:</Text>
                                <Text style={styles.modalDescription}>{selectedComplaint.description}</Text>

                                <Text style={styles.detailLabel}>Admin Notes:</Text>
                                <TextInput
                                    style={styles.notesInput}
                                    value={adminNotes}
                                    onChangeText={setAdminNotes}
                                    placeholder="Add notes for the resident..."
                                    multiline
                                    numberOfLines={3}
                                />

                                <Text style={styles.detailLabel}>Update Status:</Text>
                                <View style={styles.statusButtons}>
                                    <TouchableOpacity
                                        style={[styles.statusButton, { backgroundColor: '#FFA500' }]}
                                        onPress={() => handleStatusUpdate(selectedComplaint.id!, 'pending')}
                                    >
                                        <Text style={styles.statusButtonText}>Pending</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.statusButton, { backgroundColor: '#007AFF' }]}
                                        onPress={() => handleStatusUpdate(selectedComplaint.id!, 'in-progress')}
                                    >
                                        <Text style={styles.statusButtonText}>In Progress</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.statusButton, { backgroundColor: '#34C759' }]}
                                        onPress={() => handleStatusUpdate(selectedComplaint.id!, 'resolved')}
                                    >
                                        <Text style={styles.statusButtonText}>Resolved</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setSelectedComplaint(null)}
                                >
                                    <Text style={styles.closeButtonText}>Close</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginHorizontal: 4,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: '#007AFF',
    },
    tabText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    activeTabText: {
        color: 'white',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: 15,
    },
    card: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    residentName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    category: {
        fontSize: 12,
        color: '#666',
        textTransform: 'capitalize',
    },
    priority: {
        fontSize: 12,
        color: '#666',
        textTransform: 'capitalize',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#333',
    },
    description: {
        color: '#555',
        marginBottom: 8,
        fontSize: 14,
    },
    date: {
        fontSize: 11,
        color: '#999',
    },
    empty: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 5,
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
        textTransform: 'capitalize',
    },
    modalDescription: {
        fontSize: 14,
        color: '#555',
        marginBottom: 15,
        lineHeight: 20,
    },
    notesInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    statusButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        gap: 8,
    },
    statusButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    statusButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    closeButton: {
        backgroundColor: '#666',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
