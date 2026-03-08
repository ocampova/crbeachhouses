import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gurú',
          headerTitle: '🧙 Gurú Financiero',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="🧙" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          title: 'Finanzas',
          headerTitle: '💳 Mis Finanzas',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="💳" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="investments"
        options={{
          title: 'Inversiones',
          headerTitle: '📈 Portafolio',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="📈" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          headerTitle: '👤 Mi Perfil',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon emoji="👤" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  emoji,
  color,
  focused,
}: {
  emoji: string;
  color: string;
  focused: boolean;
}) {
  const { Text, View, StyleSheet } = require('react-native');
  return (
    <View style={[iconStyles.container, focused && iconStyles.focused]}>
      <Text style={[iconStyles.emoji, focused && iconStyles.focusedEmoji]}>{emoji}</Text>
    </View>
  );
}

const iconStyles = require('react-native').StyleSheet.create({
  container: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focused: {
    backgroundColor: colors.primary + '20',
  },
  emoji: {
    fontSize: 20,
    opacity: 0.6,
  },
  focusedEmoji: {
    opacity: 1,
  },
});
