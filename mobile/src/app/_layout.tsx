import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { NotesProvider } from "../lib/notes-context";
import { colors } from "../lib/theme";

export default function RootLayout() {
  return (
    <NotesProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="index" options={{ title: "AI Note", headerLargeTitle: true }} />
        <Stack.Screen name="record" options={{ title: "Ghi âm", presentation: "fullScreenModal", headerShown: false }} />
        <Stack.Screen name="note/[id]" options={{ title: "" }} />
        <Stack.Screen name="ask" options={{ title: "Hỏi AI", presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ title: "Cài đặt" }} />
      </Stack>
    </NotesProvider>
  );
}
