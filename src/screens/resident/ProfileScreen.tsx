import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import LoadingScreen from '../../components/LoadingScreen';

export default function ProfileScreen() {
    const { user, userData, userRole, hostelId, residentId, linkedResidentId } = useAuth();
    const { colors } = useTheme();
    const [extraData, setExtraData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Dynamic Styles
    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.text },
        card: { backgroundColor: colors.card, borderColor: colors.border },
        sectionTitle: { color: colors.primary, borderBottomColor: colors.border },
        label: { color: colors.subText },
        value: { color: colors.text },
        header: { color: colors.text }
    };

    useEffect(() => {
        const fetchExtraDetails = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                if (userRole === 'resident' && residentId) {
                    const resSnap = await getDoc(doc(db, 'residents', residentId));
                    if (resSnap.exists()) {
                        const resData = resSnap.data();
                        let hostelInfo = null;
                        if (resData.hostelId) {
                            const hDoc = await getDoc(doc(db, 'hostels', resData.hostelId));
                            if (hDoc.exists()) {
                                hostelInfo = hDoc.data();
                            }
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
                            if (hDoc.exists()) {
                                hostelInfo = hDoc.data();
                            }
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

    if (loading) {
        return <LoadingScreen message="Fetching profile details..." />;
    }

    const renderDetail = (label: string, value: string | undefined) => (
        <View style={styles.detailRow}>
            <Text style={[styles.label, dynamicStyles.label]}>{label}</Text>
            <Text style={[styles.value, dynamicStyles.value]}>{value || '-'}</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.safeArea, dynamicStyles.container]} edges={['top', 'left', 'right']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.header, dynamicStyles.header]}>My Profile</Text>

                {/* Basic Info */}
                <View style={[styles.card, dynamicStyles.card]}>
                    <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Account Details</Text>
                    {renderDetail('Name', userData?.name)}
                    {renderDetail('Role', userRole?.toUpperCase())}
                    {renderDetail('Phone', user?.phoneNumber || userData?.phone)}
                    {renderDetail('Email', userData?.email)}
                </View>

                {/* Role-Specific Info */}
                {userRole === 'resident' && extraData && (
                    <>
                        <View style={[styles.card, dynamicStyles.card]}>
                            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Stay Details</Text>
                            {renderDetail('Room No', extraData.room || extraData.roomNumber)}
                            {renderDetail('Aadhar Card', extraData.aadharCard)}
                        </View>

                        {extraData.hostel && (
                            <View style={[styles.card, dynamicStyles.card]}>
                                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Hostel Details</Text>
                                {renderDetail('Hostel Name', extraData.hostel.name)}
                                {renderDetail('Hostel Address', extraData.hostel.address)}
                            </View>
                        )}

                        <View style={[styles.card, dynamicStyles.card]}>
                            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Guardian Details</Text>
                            {renderDetail('Guardian Name', extraData.guardianName)}
                            {renderDetail('Guardian Phone', extraData.guardianPhone)}
                        </View>

                        <View style={[styles.card, dynamicStyles.card]}>
                            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Address</Text>
                            {renderDetail('Permanent Address', extraData.permanentAddress)}
                        </View>
                    </>
                )}

                {userRole === 'admin' && extraData && (
                    <View style={[styles.card, dynamicStyles.card]}>
                        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Hostel Administration</Text>
                        {renderDetail('Managed Hostel', extraData.hostelName)}
                        {renderDetail('Hostel Address', extraData.address)}
                    </View>
                )}

                {userRole === 'guardian' && extraData?.ward && (
                    <>
                        <View style={[styles.card, dynamicStyles.card]}>
                            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Ward Details</Text>
                            {renderDetail('Ward Name', extraData.ward.name)}
                            {renderDetail('Ward Room', extraData.ward.room || extraData.ward.roomNumber)}
                            {renderDetail('Ward Phone', extraData.ward.phone)}
                        </View>

                        <View style={[styles.card, dynamicStyles.card]}>
                            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Ward Stay Details</Text>
                            {renderDetail('Hostel Name', extraData.ward.hostel?.name)}
                            {renderDetail('Hostel Address', extraData.ward.hostel?.address)}
                            {renderDetail('Permanent Address', extraData.ward.permanentAddress)}
                        </View>
                    </>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        flexGrow: 1,
    },
    container: {
        padding: 20,
        flexGrow: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    card: {
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        borderBottomWidth: 1,
        paddingBottom: 5,
    },
    detailRow: {
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    value: {
        fontSize: 16,
        fontWeight: '500',
    },
    errorText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subText: {
        textAlign: 'center',
    }
});
