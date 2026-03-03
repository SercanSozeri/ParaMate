import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../models/chat_message.dart';
import '../providers/chat_provider.dart';
import '../providers/submission_provider.dart';

class ChatAssistScreen extends ConsumerStatefulWidget {
  const ChatAssistScreen({super.key});

  @override
  ConsumerState<ChatAssistScreen> createState() => _ChatAssistScreenState();
}

class _ChatAssistScreenState extends ConsumerState<ChatAssistScreen> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  final _speech = SpeechToText();
  bool _speechAvailable = false;
  bool _isListening = false;

  @override
  void initState() {
    super.initState();
    _speech.initialize(onStatus: (status) {
      if (mounted) setState(() {});
    }).then((ok) {
      if (mounted) setState(() => _speechAvailable = ok);
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _startListening() async {
    if (!_speechAvailable || _isListening) return;
    setState(() => _isListening = true);
    await _speech.listen(
      onResult: (result) {
        if (mounted && result.finalResult) {
          _textController.text = result.recognizedWords;
        }
      },
      listenFor: const Duration(seconds: 30),
      pauseFor: const Duration(seconds: 3),
      listenOptions: SpeechListenOptions(partialResults: true),
    );
    setState(() => _isListening = false);
  }

  Future<void> _stopListening() async {
    await _speech.stop();
    setState(() => _isListening = false);
  }

  void _send() {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    _textController.clear();
    ref.read(chatProvider.notifier).sendMessage(text);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final chat = ref.watch(chatProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat Assist'),
        actions: [
          TextButton(
            onPressed: chat.isLoading
                ? null
                : () {
                    ref.read(submissionProvider.notifier).setFormId(formIds.first);
                    ref.read(submissionProvider.notifier).setDraft(chat.draft);
                    Navigator.pushNamed(context, '/review');
                  },
            child: const Text('Review'),
          ),
          TextButton(
            onPressed: chat.isLoading
                ? null
                : () => ref.read(chatProvider.notifier).showSummary(),
            child: const Text('Show Summary'),
          ),
          IconButton(
            onPressed: chat.isLoading
                ? null
                : () => ref.read(chatProvider.notifier).clearSession(),
            icon: const Icon(Icons.delete_outline),
            tooltip: 'Clear session',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: chat.messages.length + (chat.error != null ? 1 : 0),
              itemBuilder: (context, index) {
                if (chat.error != null && index == chat.messages.length) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      chat.error!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  );
                }
                final msg = chat.messages[index];
                return _ChatBubble(message: msg);
              },
            ),
          ),
          if (chat.isLoading)
            const LinearProgressIndicator(),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: const InputDecoration(
                      hintText: 'Message',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 12,
                      ),
                    ),
                    maxLines: 3,
                    minLines: 1,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _speechAvailable && !chat.isLoading
                      ? (_isListening ? _stopListening : _startListening)
                      : null,
                  icon: Icon(_isListening ? Icons.mic : Icons.mic_none),
                  tooltip: _isListening ? 'Stop' : 'Speech to text',
                ),
                const SizedBox(width: 4),
                IconButton.filled(
                  onPressed: chat.isLoading ? null : _send,
                  icon: const Icon(Icons.send),
                  tooltip: 'Send',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final bg = message.isUser
        ? Theme.of(context).colorScheme.primaryContainer
        : Theme.of(context).colorScheme.surfaceContainerHighest;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Align(
        alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.85),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              message.text,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ),
      ),
    );
  }
}
