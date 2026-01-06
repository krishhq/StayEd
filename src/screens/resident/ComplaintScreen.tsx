import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { addComplaint, getComplaintsByHostel, Complaint } from '../../services/firestoreService';

export default function ComplaintScreen() {
    const { user, hostelId, userData, residentId } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<'maintenance' | 'food' | 'cleanliness' | 'wifi' | 'security' | 'other'>('maintenance');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const categories: Array<{ value: 'maintenance' | 'food' | 'cleanliness' | 'wifi' | 'security' | 'other', label: string }> = [
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'food', label: 'Food' },
        { value: 'cleanliness', label: 'Cleanliness' },
        { value: 'wifi', label: 'WiFi' },
        { value: 'security', label: 'Security' },
        { value: 'other', label: 'Other' }
    ];

    const currentCategoryLabel = categories.find(c => c.value === category)?.label || 'Select Category';

    const fetchMyComplaints = async () => {
        const ids = [];
        if (residentId) ids.push(residentId);
        if (user?.uid) ids.push(user.uid);

        // Remove duplicates and ensure we have at least one ID
        const uniqueIds = Array.from(new Set(ids));

        if (!hostelId || uniqueIds.length === 0) {
            console.log("[ComplaintScreen] Missing ID or HostelID", { uniqueIds, hostelId });
            return;
        }

        try {
            console.log(`[ComplaintScreen] Fetching for IDs: ${uniqueIds.join(', ')}`);
            const complaints = await getComplaintsByHostel(hostelId, undefined, uniqueIds);
            setMyComplaints(complaints);
        } catch (error) {
            console.error('Error fetching my complaints:', error);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            if (hostelId && (residentId || user?.uid)) {
                fetchMyComplaints();
            }
        }, [hostelId, user, residentId])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMyComplaints();
        setRefreshing(false);
    };

    const submitComplaint = async () => {
        if (!title || !description) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (!hostelId || !user) {
            Alert.alert('Error', 'Missing hostel or user information');
            return;
        }

        try {
            const idToUse = residentId || user.uid;
            await addComplaint({
                hostelId,
                residentId: idToUse,
                residentName: userData?.name || user.displayName || 'Resident',
                category,
                title,
                description,
                priority: 'medium'
            });

            Alert.alert('Success', 'Complaint submitted successfully!');
            setTitle('');
            setDescription('');
            setCategory('maintenance');
            await fetchMyComplaints();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit complaint');
        }
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

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <Text style={styles.header}>Raise a Complaint</Text>

            <Text style={styles.label}>Category*</Text>
            <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowCategoryPicker(true)}
            >
                <Text style={styles.dropdownText}>{currentCategoryLabel}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            <Modal
                visible={showCategoryPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCategoryPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCategoryPicker(false)}
                >
                    <View style={styles.pickerContainer}>
                        <Text style={styles.pickerTitle}>Select Category</Text>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.value}
                                style={[
                                    styles.pickerItem,
                                    category === cat.value && styles.selectedPickerItem
                                ]}
                                onPress={() => {
                                    setCategory(cat.value);
                                    setShowCategoryPicker(false);
                                }}
                            >
                                <Text style={[
                                    styles.pickerItemText,
                                    category === cat.value && styles.selectedPickerItemText
                                ]}>
                                    {cat.label}
                                </Text>
                                {category === cat.value && <Text style={styles.checkIcon}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            <Text style={styles.label}>Title*</Text>
            <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Fan not working in Room 101"
            />

            <Text style={styles.label}>Description*</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Please provide details about the issue..."
                multiline
                numberOfLines={4}
            />

            <View style={styles.buttonContainer}>
                <Button title="Submit Complaint" onPress={submitComplaint} />
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>My Complaints ({myComplaints.length})</Text>

            {myComplaints.length === 0 ? (
                <Text style={styles.emptyText}>No complaints submitted yet.</Text>
            ) : (
                myComplaints.map((complaint) => (
                    <View key={complaint.id} style={styles.complaintCard}>
                        <View style={styles.complaintHeader}>
                            <Text style={styles.complaintTitle}>{complaint.title}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(complaint.status) }]}>
                                <Text style={styles.statusText}>{getStatusLabel(complaint.status)}</Text>
                            </View>
                        </View>
                        <Text style={styles.complaintCategory}>📁 {complaint.category}</Text>
                        <Text style={styles.complaintDescription} numberOfLines={2}>
                            {complaint.description}
                        </Text>
                        <Text style={styles.complaintDate}>
                            {complaint.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                        </Text>
                        {complaint.adminNotes && (
                            <View style={styles.adminNotesContainer}>
                                <Text style={styles.adminNotesLabel}>Admin Notes:</Text>
                                <Text style={styles.adminNotes}>{complaint.adminNotes}</Text>
                            </View>
                        )}
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
        backgroundColor: '#f8f9fa',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#2c3e50',
    },
    label: {
        fontWeight: '600',
        marginTop: 15,
        color: '#34495e',
        fontSize: 14,
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
        backgroundColor: 'white',
    },
    dropdownText: {
        fontSize: 15,
        color: '#2c3e50',
    },
    dropdownArrow: {
        fontSize: 12,
        color: '#95a5a6',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerContainer: {
        backgroundColor: 'white',
        width: '85%',
        borderRadius: 15,
        padding: 20,
        elevation: 10,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#2c3e50',
        textAlign: 'center',
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1',
    },
    selectedPickerItem: {
        backgroundColor: '#f0f7ff',
    },
    pickerItemText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    selectedPickerItemText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    checkIcon: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
        backgroundColor: 'white',
        fontSize: 15,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    buttonContainer: {
        marginTop: 25,
        marginBottom: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 30,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#2c3e50',
    },
    emptyText: {
        textAlign: 'center',
        color: '#95a5a6',
        fontStyle: 'italic',
        marginTop: 20,
    },
    complaintCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    complaintHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    complaintTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        flex: 1,
        marginRight: 10,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },
    complaintCategory: {
        fontSize: 13,
        color: '#7f8c8d',
        marginBottom: 8,
    },
    complaintDescription: {
        fontSize: 14,
        color: '#34495e',
        marginBottom: 12,
        lineHeight: 20,
    },
    complaintDate: {
        fontSize: 12,
        color: '#95a5a6',
    },
    adminNotesContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
        borderRadius: 6,
    },
    adminNotesLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 4,
    },
    adminNotes: {
        fontSize: 13,
        color: '#2c3e50',
    },
});
