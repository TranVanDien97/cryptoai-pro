/**
 * AppNavigator — Bottom tab navigation with 5 tabs
 * Phase 2: Integrated with real-time WebSocket hooks
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {colors, spacing} from '../theme';
import {HomeScreen} from '../screens/HomeScreen';
import {MarketScreen} from '../screens/MarketScreen';
import {AISignalsScreen} from '../screens/AISignalsScreen';
import {PortfolioScreen} from '../screens/PortfolioScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {NotificationsScreen} from '../screens/NotificationsScreen';
import {useRealtimePrices, useRealtimeAlerts} from '../hooks/useRealtime';
import {useMarketStore} from '../stores/marketStore';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabConfig: Record<string, {emoji: string; label: string}> = {
  Home: {emoji: '🏠', label: 'Trang chủ'},
  Market: {emoji: '📊', label: 'Thị trường'},
  AISignals: {emoji: '🤖', label: 'AI'},
  Portfolio: {emoji: '💼', label: 'Danh mục'},
  Settings: {emoji: '⚙️', label: 'Cài đặt'},
};

function TabIcon({routeName, focused}: {routeName: string; focused: boolean}) {
  const config = tabConfig[routeName];
  const isAI = routeName === 'AISignals';

  if (isAI) {
    return (
      <View style={[styles.aiTab, focused && styles.aiTabActive]}>
        <Text style={styles.aiEmoji}>{config.emoji}</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.emoji, focused && styles.emojiActive]}>{config.emoji}</Text>
    </View>
  );
}

function MainTabs() {
  // Initialize real-time data hooks at tab level
  useRealtimePrices();
  useRealtimeAlerts();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({focused}) => (
          <TabIcon routeName={route.name} focused={focused} />
        ),
        tabBarLabel: tabConfig[route.name]?.label || route.name,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Market" component={MarketScreen} />
      <Tab.Screen
        name="AISignals"
        component={AISignalsScreen}
        options={{
          tabBarActiveTintColor: colors.aiGold,
        }}
      />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.loss,
        },
        fonts: {
          regular: {fontFamily: 'System', fontWeight: '400'},
          medium: {fontFamily: 'System', fontWeight: '500'},
          bold: {fontFamily: 'System', fontWeight: '700'},
          heavy: {fontFamily: 'System', fontWeight: '900'},
        },
      }}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  emojiActive: {
    opacity: 1,
  },
  aiTab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
  },
  aiTabActive: {
    backgroundColor: colors.aiGold + '25',
    borderWidth: 2,
    borderColor: colors.aiGold + '60',
  },
  aiEmoji: {
    fontSize: 22,
  },
});
