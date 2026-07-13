import { Tabs, Redirect } from "expo-router";
import { Text, View } from "react-native";
import { colors, radii, spacing } from "@sisg/ui-tokens";
import { useAuth } from "../../lib/auth";

function TabIcon({ active, glyph }: { active: boolean; glyph: string }) {
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: radii.pill,
        backgroundColor: active ? colors.primary : colors.surfaceAlt,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.stroke,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.text, fontSize: 11, fontWeight: "800", letterSpacing: 0.4 }}>{glyph}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { session, hydrated } = useAuth();

  if (hydrated && !session) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          position: "absolute",
          left: spacing.md,
          right: spacing.md,
          bottom: spacing.md,
          height: 78,
          paddingTop: 10,
          paddingBottom: 14,
          paddingHorizontal: 4,
          backgroundColor: colors.overlay,
          borderTopColor: colors.stroke,
          borderTopWidth: 1,
          borderRadius: radii.xl,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
        sceneStyle: {
          backgroundColor: "transparent",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon active={focused} glyph="HM" />,
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          title: "Work",
          tabBarIcon: ({ focused }) => <TabIcon active={focused} glyph="WK" />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ focused }) => <TabIcon active={focused} glyph="IN" />,
        }}
      />
      <Tabs.Screen
        name="intake"
        options={{
          title: "Intake",
          tabBarIcon: ({ focused }) => <TabIcon active={focused} glyph="IQ" />,
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          title: "Agents",
          tabBarIcon: ({ focused }) => <TabIcon active={focused} glyph="AG" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon active={focused} glyph="ME" />,
        }}
      />
    </Tabs>
  );
}
