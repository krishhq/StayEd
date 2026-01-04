import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ProfileScreen() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Dynamic Styles
    const dynamicStyles = {
        container: { backgroundColor: colors.background },
        text: { color: colors.text },
        card: { backgroundColor: colors.card },
        sectionTitle: { color: colors.primary, borderBottomColor: colors.border },
        label: { color: colors.subText },
        value: { color: colors.text },
        header: { color: colors.text }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.phoneNumber) {
                setLoading(false);
                return;
            }

            try {
                const q = query(collection(db, 'residents_data'), where('phone', '==', user.phoneNumber));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    setProfile(snapshot.docs[0].data());
                } else {
                    console.log("No profile found for phone:", user.phoneNumber);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.text }]}>Profile not found.</Text>
                <Text style={[styles.subText, { color: colors.subText }]}>Please ask the Admin to register you with your phone number: {user?.phoneNumber}</Text>
            </View>
        );
    }

    const renderDetail = (label: string, value: string) => (
        <View style={styles.detailRow}>
            <Text style={[styles.label, dynamicStyles.label]}>{label}</Text>
            <Text style={[styles.value, dynamicStyles.value]}>{value || '-'}</Text>
        </View>
    );

    return (
        <ScrollView contentContainerStyle={[styles.container, dynamicStyles.container]}>
            <Text style={[styles.header, dynamicStyles.header]}>My Profile</Text>

            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Personal Details</Text>
                {renderDetail('Name', profile.name)}
                {renderDetail('Phone', profile.phone)}
                {renderDetail('Email', profile.email)}
                {renderDetail('Room No', profile.room)}
                {renderDetail('Aadhar Card', profile.aadharCard)}
            </View>

            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Guardian Details</Text>
                {renderDetail('Guardian Name', profile.guardianName)}
                {renderDetail('Guardian Phone', profile.guardianPhone)}
            </View>

            <View style={[styles.card, dynamicStyles.card]}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Address</Text>
                {renderDetail('Permanent Address', profile.permanentAddress)}
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
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
