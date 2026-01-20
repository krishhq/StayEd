import * as React from 'react';
import { StyleSheet, View, Text, Linking, ViewProps, TextStyle, StyleProp } from 'react-native';

export interface FirebaseRecaptchaBannerProps extends ViewProps {
    textStyle?: StyleProp<TextStyle>;
    linkStyle?: StyleProp<TextStyle>;
}

export default function FirebaseRecaptchaBanner(props: FirebaseRecaptchaBannerProps) {
    const { textStyle, linkStyle, ...otherProps } = props;
    return (
        <View {...otherProps}>
            <Text style={[styles.text, textStyle]}>
                This app is protected by reCAPTCHA and the Google
                <Text
                    style={[styles.link, linkStyle]}
                    onPress={() => Linking.openURL('https://policies.google.com/privacy')}
                >
                    &nbsp;Privacy Policy&nbsp;
                </Text>
                and
                <Text
                    style={[styles.link, linkStyle]}
                    onPress={() => Linking.openURL('https://policies.google.com/terms')}
                >
                    &nbsp;Terms of Service&nbsp;
                </Text>
                apply.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    text: {
        fontSize: 13,
        opacity: 0.5,
    },
    link: {
        color: 'blue',
    },
});
