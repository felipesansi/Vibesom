import { TextInput, Text, View, StyleSheet } from "react-native";
import colors from "../../constants/Colors";

type InputProps = {
    placeholder: string;
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    secureTextEntry?: boolean;
};

export default function Input({ placeholder, label, value, onChangeText, secureTextEntry = false }: InputProps) {
    return (
        <View style={styles.container}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={colors.input_text + '80'}
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                autoCapitalize="none"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    input: {
        backgroundColor: colors.input,
        color: colors.input_text,
        width: '100%',
        height: 59,
        borderRadius: 40,
        paddingHorizontal: 20,
    },
    label: {
        color: colors.input_text,
        fontSize: 16,
        marginBottom: 8,
    },
});
