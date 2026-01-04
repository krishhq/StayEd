import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ResidentForumScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Community Forum</Text>
            <Text>Chat and Urgent Alerts will go here.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    }
});
