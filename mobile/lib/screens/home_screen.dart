import 'package:flutter/material.dart';
import '../services/api_client.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiClient _apiClient = const ApiClient();
  String _statusMessage = 'Press the button to check server health.';
  bool _isLoading = false;

  Future<void> _checkHealth() async {
    setState(() {
      _isLoading = true;
      _statusMessage = 'Checking server health...';
    });

    try {
      final result = await _apiClient.getHealth();
      final ok = result['ok'] == true;
      setState(() {
        _statusMessage = ok
            ? 'Server is healthy: ${result.toString()}'
            : 'Server responded but not OK: ${result.toString()}';
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Error checking health: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ParaMate – AI Paramedic Assistant'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'ParaMate – AI Paramedic Assistant',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => Navigator.pushNamed(context, '/chat'),
                icon: const Icon(Icons.chat),
                label: const Text('Chat Assist'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _checkHealth,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Check Server Health'),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              _statusMessage,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

