import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../providers/submission_provider.dart';

Future<void> _sharePdf(BuildContext context, String base64) async {
  try {
    final bytes = base64Decode(base64);
    if (bytes.isEmpty) return;
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/paramate_form.pdf');
    await file.writeAsBytes(bytes);
    await Share.shareXFiles(
      [XFile(file.path)],
      text: 'ParaMate form',
    );
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Share failed: $e')),
      );
    }
  }
}

class ConfirmationScreen extends ConsumerWidget {
  const ConfirmationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pdfBase64 = ref.watch(submissionProvider).lastSentPdfBase64;

    return Scaffold(
      appBar: AppBar(title: const Text('Sent')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.check_circle_outline,
              size: 72,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 24),
            Text(
              'Sent to email',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            if (pdfBase64 != null && pdfBase64.isNotEmpty)
              FilledButton.icon(
                onPressed: () => _sharePdf(context, pdfBase64),
                icon: const Icon(Icons.share),
                label: const Text('Share PDF'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                ),
              )
            else
              const SizedBox.shrink(),
          ],
        ),
      ),
    );
  }
}
