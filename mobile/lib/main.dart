import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'screens/chat_assist_screen.dart';
import 'screens/confirmation_screen.dart';
import 'screens/home_screen.dart';
import 'screens/review_screen.dart';
import 'screens/submit_screen.dart';
import 'screens/voice_mode_screen.dart';

void main() {
  runApp(
    const ProviderScope(
      child: ParaMateApp(),
    ),
  );
}

class ParaMateApp extends StatelessWidget {
  const ParaMateApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ParaMate',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.redAccent),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
      routes: {
        '/chat': (context) => const ChatAssistScreen(),
        '/review': (context) => const ReviewScreen(),
        '/submit': (context) => const SubmitScreen(),
        '/confirmation': (context) => const ConfirmationScreen(),
        '/voice': (context) => const VoiceModeScreen(),
      },
    );
  }
}

