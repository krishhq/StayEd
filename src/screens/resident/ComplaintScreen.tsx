import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { addComplaint, getComplaintsByHostel, Complaint } from '../../services/firestoreService';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';

export default function ComplaintScreen() {
    const { user, hostelId, userData, residentId } = useAuth();
    const { colors, theme } = useTheme();
    const navigation = useNavigation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<'maintenance' | 'food' | 'cleanliness' | 'wifi' | 'security' | 'other'>('maintenance');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const categories: Array<{ value: 'maintenance' | 'food' | 'cleanliness' | 'wifi' | 'security' | 'other', label: string, icon: string }> = [
        { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
        { value: 'food', label: 'Food & Mess', icon: '🍲' },
        { value: 'cleanliness', label: 'Cleanliness', icon: '🧹' },
        { value: 'wifi', label: 'WiFi & Internet', icon: '📶' },
        { value: 'security', label: 'Security', icon: '🛡️' },
        { value: 'other', label: 'Other Issues', icon: '📝' }
    ];

    const currentCategory = categories.find(c => c.value === category);

    const fetchMyComplaints = async () => {
        const ids = [];
        if (residentId) ids.push(residentId);
        if (user?.uid) ids.push(user.uid);
        const uniqueIds = Array.from(new Set(ids));
        if (!hostelId || uniqueIds.length === 0) return;

        try {
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
            Alert.alert('Missing Info', 'Please provide both a title and description.');
            return;
        }

        if (!hostelId || !user) {
            Alert.alert('Error', 'Authentication error. Please re-login.');
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

            Alert.alert('Submitted', 'Your complaint has been logged and notified to the warden.');
            setTitle('');
            setDescription('');
            setCategory('maintenance');
            await fetchMyComplaints();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit complaint');
        }
    };

    const getStatusTheme = (status: string) => {
        switch (status) {
            case 'pending': return { color: '#F59E0B', label: 'Pending' };
            case 'in-progress': return { color: colors.primary, label: 'In Progress' };
            case 'resolved': return { color: '#10B981', label: 'Resolved' };
            default: return { color: colors.subText, label: status };
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Complaints" onBackPress={() => navigation.goBack()} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* Raise Complaint Card */}
                <Card style={styles.formCard} variant="elevated">
                    <Text style={[styles.formTitle, { color: colors.text }]}>New Issue</Text>

                    <Text style={[styles.label, { color: colors.subText }]}>Category</Text>
                    <TouchableOpacity
                        style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() => setShowCategoryPicker(true)}
                    >
                        <Text style={[styles.dropdownText, { color: colors.text }]}>
                            {currentCategory?.icon} {currentCategory?.label}
                        </Text>
                        <Text style={[styles.dropdownArrow, { color: colors.subText }]}>▼</Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: colors.subText, marginTop: Spacing.md }]}>Summary</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="What's the issue?"
                        placeholderTextColor={colors.subText + '80'}
                    />

                    <Text style={[styles.label, { color: colors.subText, marginTop: Spacing.md }]}>Details</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Elaborate so we can fix it faster..."
                        placeholderTextColor={colors.subText + '80'}
                        multiline
                    />

                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                        onPress={submitComplaint}
                    >
                        <Text style={styles.submitBtnText}>Submit Complaint</Text>
                    </TouchableOpacity>
                </Card>

                {/* History Section */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>My History ({myComplaints.length})</Text>

                {myComplaints.length === 0 ? (
                    <Card style={styles.emptyCard} variant="flat">
                        <Text style={{ color: colors.subText, textAlign: 'center' }}>No complaints filed yet.</Text>
                    </Card>
                ) : (
                    myComplaints.map((complaint) => {
                        const statusTheme = getStatusTheme(complaint.status);
                        return (
                            <Card key={complaint.id} style={styles.historyCard} variant="outlined">
                                <View style={styles.complaintHeader}>
                                    <View>
                                        <Text style={[styles.complaintTitle, { color: colors.text }]}>{complaint.title}</Text>
                                        <Text style={[styles.complaintCategory, { color: colors.subText }]}>📁 {complaint.category}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: statusTheme.color + '20' }]}>
                                        <Text style={[styles.statusText, { color: statusTheme.color }]}>{statusTheme.label}</Text>
                                    </View>
                                </View>

                                <Text style={[styles.complaintDesc, { color: colors.text }]} numberOfLines={2}>
                                    {complaint.description}
                                </Text>

                                <View style={styles.complaintFooter}>
                                    <Text style={[styles.complaintDate, { color: colors.subText }]}>
                                        📅 {complaint.createdAt?.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) || 'N/A'}
                                    </Text>
                                </View>

                                {complaint.adminNotes && (
                                    <View style={[styles.adminNotes, { backgroundColor: colors.primary + '08', borderLeftColor: colors.primary }]}>
                                        <Text style={[styles.adminNoteLabel, { color: colors.primary }]}>WARDEN'S NOTE</Text>
                                        <Text style={[styles.adminNoteText, { color: colors.text }]}>{complaint.adminNotes}</Text>
                                    </View>
                                )}
                            </Card>
                        );
                    })
                )}
            </ScrollView>

            {/* Category Picker Modal */}
            <Modal visible={showCategoryPicker} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
                    <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
                        <View style={styles.pickerHeader}>
                            <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
                            <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Category</Text>
                        </View>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.value}
                                style={[styles.pickerItem, category === cat.value && { backgroundColor: colors.primary + '10' }]}
                                onPress={() => { setCategory(cat.value); setShowCategoryPicker(false); }}
                            >
                                <Text style={styles.pickerIcon}>{cat.icon}</Text>
                                <Text style={[styles.pickerLabel, { color: colors.text, fontWeight: category === cat.value ? 'bold' : 'normal' }]}>
                                    {cat.label}
                                </Text>
                                {category === cat.value && <Text style={{ color: colors.primary }}>✓</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
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
    formCard: {
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    formTitle: {
        fontSize: Typography.size.lg,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
    },
    dropdownText: {
        fontSize: Typography.size.md,
    },
    dropdownArrow: {
        fontSize: Typography.size.xs,
    },
    input: {
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        fontSize: Typography.size.md,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    submitBtn: {
        marginTop: Spacing.lg,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        ...Shadows.md,
    },
    submitBtnText: {
        color: 'white',
        fontWeight: Typography.weight.bold,
        fontSize: Typography.size.md,
    },
    sectionTitle: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
        marginBottom: Spacing.md,
        paddingHorizontal: 4,
    },
    historyCard: {
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    complaintHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    complaintTitle: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
    },
    complaintCategory: {
        fontSize: Typography.size.xs,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    statusText: {
        fontSize: Typography.size.xs,
        fontWeight: Typography.weight.bold,
    },
    complaintDesc: {
        fontSize: Typography.size.sm,
        lineHeight: 20,
        marginBottom: Spacing.md,
    },
    complaintFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    complaintDate: {
        fontSize: Typography.size.xs,
    },
    adminNotes: {
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderLeftWidth: 4,
    },
    adminNoteLabel: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        marginBottom: 4,
    },
    adminNoteText: {
        fontSize: Typography.size.sm,
        fontStyle: 'italic',
    },
    emptyCard: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        paddingBottom: 40,
    },
    pickerHeader: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    pickerHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginBottom: Spacing.md,
    },
    pickerTitle: {
        fontSize: Typography.size.md,
        fontWeight: Typography.weight.bold,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        marginBottom: 4,
    },
    pickerIcon: {
        fontSize: 20,
        marginRight: Spacing.md,
    },
    pickerLabel: {
        flex: 1,
        fontSize: Typography.size.md,
    },
});

