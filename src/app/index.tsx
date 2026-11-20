import { StyleSheet, Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title} accessibilityRole="header">
        DiveData
      </Text>
      <Text style={styles.body}>Find a meet to get started.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0e1417',
  },
  title: { color: '#e6edf0', fontSize: 32, fontWeight: '700', marginBottom: 8 },
  body: { color: '#94a8b0', fontSize: 18 },
});
