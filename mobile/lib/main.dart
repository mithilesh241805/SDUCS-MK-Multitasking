import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';

void main() {
  runApp(const SducsApp());
}

class SducsApp extends StatelessWidget {
  const SducsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SDUCS MK Multitasking',
      debugShowCheckedModeBanner: false,
      theme: _buildDarkTheme(),
      initialRoute: '/login',
      routes: {
        '/login': (context) => const LoginScreen(),
        '/dashboard': (context) => const DashboardScreen(),
      },
    );
  }

  ThemeData _buildDarkTheme() {
    final base = ThemeData.dark();
    return base.copyWith(
      scaffoldBackgroundColor: const Color(0xFF0A0A1A),
      primaryColor: const Color(0xFF7C3AED),
      colorScheme: base.colorScheme.copyWith(
        primary: const Color(0xFF7C3AED),
        secondary: const Color(0xFF3B82F6),
        background: const Color(0xFF0F0C29),
      ),
      textTheme: GoogleFonts.outfitTextTheme(base.textTheme).copyWith(
        displayLarge: GoogleFonts.outfit(fontWeight: FontWeight.w900, color: Colors.white),
        bodyLarge: GoogleFonts.outfit(color: Colors.white70),
      ),
    );
  }
}
