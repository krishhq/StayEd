import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

export default function ComplaintScreen() {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('General'); // Default

    // Simple mock categories
    const categories = ['General', 'Electrical', 'Plumbing', 'Food', 'Internet'];

    const submitComplaint = async () => {
        if (!title || !description) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            if (user) {
                // Real Firestore Submission
                await addDoc(collection(db, 'complaints'), {
                    userId: user.uid,
                    title,
                    description,
                    category,
                    status: 'pending',
                    createdAt: serverTimestamp(),
                });
                Alert.alert('Success', 'Complaint Submitted!');
                setTitle('');
                setDescription('');
            } else {
                // Dev Mode Fallback
                Alert.alert('Dev Mode', 'Complaint logged to console');
                console.log({ title, description, category });
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.header}>Raise a Complaint</Text>

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
                {categories.map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.categoryChip, category === cat && styles.selectedChip]}
                        onPress={() => setCategory(cat)}
                    >
                        <Text style={[styles.chipText, category === cat && styles.selectedChipText]}>
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Title</Text>
            <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Fan not working"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Details..."
                multiline
                numberOfLines={4}
            />

            <Button title="Submit Complaint" onPress={submitComplaint} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    label: {
        fontWeight: 'bold',
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        marginTop: 5,
        backgroundColor: 'white',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginVertical: 10,
    },
    categoryChip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginRight: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    selectedChip: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    chipText: {
        color: '#333',
    },
    selectedChipText: {
        color: 'white',
        fontWeight: 'bold',
    }
});
