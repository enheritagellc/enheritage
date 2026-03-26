import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

function TabIcon({ focused, name }: { focused: boolean; name: string }) {
  const icons: Record<string, string> = {
    Home: '⌂',
    Interview: '▶',
    Profile: '◉',
  };
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperFocused]}>
      <Text style={[styles.iconText, focused && styles.iconTextFocused]}>
        {icons[name] ?? '●'}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D1D35',
          borderTopColor: 'rgba(255,255,255,0.1)',
          height: 72,
          paddingBottom: 12,
        },
        tabBarActiveTintColor: '#C8973A',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="Home" />,
        }}
      />
      <Tabs.Screen
        name="interview"
        options={{
          title: 'Interview',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="Interview" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="Profile" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  iconWrapperFocused: {
    backgroundColor: 'rgba(200, 151, 58, 0.2)',
  },
  iconText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  iconTextFocused: {
    color: '#C8973A',
  },
});
