import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/chat_provider.dart';
import '../providers/profile_provider.dart';
import '../providers/submission_provider.dart';
import '../services/api_client.dart';

const _apiClient = ApiClient();

class SubmitScreen extends ConsumerStatefulWidget {
  const SubmitScreen({super.key});

  @override
  ConsumerState<SubmitScreen> createState() => _SubmitScreenState();
}

class _SubmitScreenState extends ConsumerState<SubmitScreen> {
  late TextEditingController _emailController;
  bool _isSending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final email = ref.read(profileProvider).defaultEmail;
    _emailController = TextEditingController(text: email);
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _generateAndSend() async {
    final formId = ref.read(submissionProvider).formId;
    final draft = ref.read(submissionProvider).draft;
    final email = _emailController.text.trim();

    if (formId == null || formId.isEmpty) {
      setState(() => _error = 'Select a form in Review first.');
      return;
    }
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Enter a valid email.');
      return;
    }

    setState(() {
      _error = null;
      _isSending = true;
    });

    try {
      ref.read(profileProvider.notifier).setDefaultEmail(email);

      final renderResult = await _apiClient.postRender(formId: formId, draft: draft);
      final pdfBase64 = renderResult['pdf'] as String?;
      if (pdfBase64 == null || pdfBase64.isEmpty) {
        throw Exception('No PDF returned');
      }

      await _apiClient.postSend(
        formId: formId,
        draft: draft,
        targetEmail: email,
      );

      ref.read(submissionProvider.notifier).setLastSentPdf(pdfBase64);
      ref.read(voiceSessionActiveProvider.notifier).state = false;
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/confirmation');
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSending = false;
          _error = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Submit')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Send to',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                hintText: 'email@example.com',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const Spacer(),
            FilledButton(
              onPressed: _isSending ? null : _generateAndSend,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isSending
                  ? const SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Generate & Send'),
            ),
          ],
        ),
      ),
    );
  }
}
