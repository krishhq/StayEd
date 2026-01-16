import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import LoadingScreen from '../../components/LoadingScreen';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import { Spacing, BorderRadius, Typography, Shadows } from '../../constants/DesignSystem';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
    const { user, userData, userRole, hostelId, residentId, linkedResidentId } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();
    const [extraData, setExtraData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExtraDetails = async () => {
            if (!user) { setLoading(false); return; }
            try {
                if (userRole === 'resident' && residentId) {
                    const resSnap = await getDoc(doc(db, 'residents', residentId));
                    if (resSnap.exists()) {
                        const resData = resSnap.data();
                        let hostelInfo = null;
                        if (resData.hostelId) {
                            const hDoc = await getDoc(doc(db, 'hostels', resData.hostelId));
                            if (hDoc.exists()) { hostelInfo = hDoc.data(); }
                        }
                        setExtraData({ ...resData, hostel: hostelInfo });
                    }
                } else if (userRole === 'admin' && hostelId) {
                    const hDoc = await getDoc(doc(db, 'hostels', hostelId));
                    if (hDoc.exists()) {
                        const hData = hDoc.data();
                        setExtraData({ hostelName: hData.name, address: hData.address });
                    }
                } else if (userRole === 'guardian' && linkedResidentId) {
                    const wardRef = doc(db, 'residents', linkedResidentId);
                    const wardSnap = await getDoc(wardRef);
                    if (wardSnap.exists()) {
                        const wardData = wardSnap.data();
                        let hostelInfo = null;
                        if (wardData.hostelId) {
                            const hDoc = await getDoc(doc(db, 'hostels', wardData.hostelId));
                            if (hDoc.exists()) { hostelInfo = hDoc.data(); }
                        }
                        setExtraData({ ward: { ...wardData, hostel: hostelInfo } });
                    }
                }
            } catch (error) {
                console.error("Error fetching extra profile details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchExtraDetails();
    }, [user, userRole, hostelId, userData, residentId, linkedResidentId]);

    if (loading) return <LoadingScreen message="Refining your profile..." />;

    const renderDetail = (label: string, value: string | undefined) => (
        <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.subText }]}>{label.toUpperCase()}</Text>
            <Text style={[styles.value, { color: colors.text }]}>{value || '-'}</Text>
        </View>
    );

    const ProfileSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: colors.subText }]}>{title}</Text>
            <Card style={styles.profileCard} variant="outlined">
                {children}
            </Card>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScreenHeader title="Account" onBackPress={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>{userData?.name?.charAt(0) || userRole?.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.userName, { color: colors.text }]}>{userData?.name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.roleText}>{userRole?.toUpperCase()}</Text>
                    </View>
                </View>

                <ProfileSection title="Contact Information">
                    {renderDetail('Phone Number', user?.phoneNumber || userData?.phone)}
                    {renderDetail('Email Address', userData?.email)}
                </ProfileSection>

                {userRole === 'resident' && extraData && (
                    <>
                        <ProfileSection title="Campus Identity">
                            {renderDetail('Room Number', extraData.room || extraData.roomNumber)}
                            {renderDetail('Aadhar ID', extraData.aadharCard)}
                            {renderDetail('Hostel', extraData.hostel?.name)}
                        </ProfileSection>

                        <ProfileSection title="Family & Permanent Records">
                            {renderDetail('Guardian', extraData.guardianName)}
                            {renderDetail('Guardian Phone', extraData.guardianPhone)}
                            {renderDetail('Home Address', extraData.permanentAddress)}
                        </ProfileSection>
                    </>
                )}

                {userRole === 'admin' && extraData && (
                    <ProfileSection title="Administrative Authority">
                        {renderDetail('Managed Hostel', extraData.hostelName)}
                        {renderDetail('Campus Address', extraData.address)}
                    </ProfileSection>
                )}

                {userRole === 'guardian' && extraData?.ward && (
                    <>
                        <ProfileSection title="Student Details">
                            {renderDetail('Ward Name', extraData.ward.name)}
                            {renderDetail('Room', extraData.ward.room || extraData.ward.roomNumber)}
                            {renderDetail('Ward Contact', extraData.ward.phone)}
                        </ProfileSection>

                        <ProfileSection title="Stay Information">
                            {renderDetail('Hostel', extraData.ward.hostel?.name)}
                            {renderDetail('Campus Address', extraData.ward.hostel?.address)}
                        </ProfileSection>
                    </>
                )}
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
    header: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginBottom: Spacing.md,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: Typography.weight.bold,
    },
    userName: {
        fontSize: Typography.size.lg,
        fontWeight: Typography.weight.bold,
        marginBottom: 8,
    },
    roleBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    roleText: {
        color: 'white',
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionHeader: {
        fontSize: 10,
        fontWeight: Typography.weight.bold,
        letterSpacing: 1,
        marginLeft: 8,
        marginBottom: 8,
    },
    profileCard: {
        padding: Spacing.lg,
    },
    detailRow: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 9,
        fontWeight: Typography.weight.bold,
        letterSpacing: 0.5,
        marginBottom: 4,
        opacity: 0.6,
    },
    value: {
        fontSize: Typography.size.sm,
        fontWeight: Typography.weight.semibold,
    },
});


