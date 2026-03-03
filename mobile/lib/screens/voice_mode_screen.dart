import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../models/chat_message.dart';
import '../providers/chat_provider.dart';

enum VoiceLanguage { english, french }

class VoiceModeScreen extends ConsumerStatefulWidget {
  const VoiceModeScreen({super.key});

  @override
  ConsumerState<VoiceModeScreen> createState() => _VoiceModeScreenState();
}

class _VoiceModeScreenState extends ConsumerState<VoiceModeScreen> {
  final SpeechToText _speech = SpeechToText();
  final FlutterTts _tts = FlutterTts();
  bool _speechAvailable = false;
  bool _isListening = false;
  bool _isSpeaking = false;
  VoiceLanguage _language = VoiceLanguage.english;

  @override
  void initState() {
    super.initState();
    _initSpeech();
    _initTts();
  }

  Future<void> _initSpeech() async {
    final available = await _speech.initialize(
      onStatus: (status) {},
      onError: (error) {},
    );
    if (mounted) {
      setState(() {
        _speechAvailable = available;
      });
    }
  }

  Future<void> _initTts() async {
    await _tts.setLanguage(_ttsLanguageCode);
    await _tts.setSpeechRate(0.9);
  }

  String get _sttLocaleId =>
      _language == VoiceLanguage.english ? 'en_US' : 'fr_FR';

  String get _ttsLanguageCode =>
      _language == VoiceLanguage.english ? 'en-US' : 'fr-FR';

  String get _languageLabel =>
      _language == VoiceLanguage.english ? 'EN' : 'FR';

  Future<void> _setLanguage(VoiceLanguage lang) async {
    if (_language == lang) return;
    setState(() {
      _language = lang;
    });
    await _tts.setLanguage(_ttsLanguageCode);
  }

  @override
  void dispose() {
    _speech.stop();
    _tts.stop();
    super.dispose();
  }

  Future<void> _startListening() async {
    if (!_speechAvailable || _isListening) return;
    setState(() {
      _isListening = true;
    });
    await _speech.listen(
      localeId: _sttLocaleId,
      onResult: (result) async {
        if (!mounted) return;
        if (result.finalResult) {
          final text = result.recognizedWords.trim();
          if (text.isNotEmpty) {
            await _handleUserUtterance(text);
          }
        }
      },
      listenFor: const Duration(seconds: 20),
      pauseFor: const Duration(seconds: 3),
      listenOptions: SpeechListenOptions(partialResults: true),
    );
    if (mounted) {
      setState(() {
        _isListening = false;
      });
    }
  }

  Future<void> _stopListening() async {
    await _speech.stop();
    if (mounted) {
      setState(() {
        _isListening = false;
      });
    }
  }

  Future<void> _handleUserUtterance(String text) async {
    final notifier = ref.read(chatProvider.notifier);
    final normalized = text.toLowerCase();

    // Simple demo hotword detection – no background service.
    if (normalized.contains('hey paramate')) {
      const reply = 'Yes, how can I help you?';
      notifier.addLocalExchange(text, reply);
      await _speak(reply);
      return;
    }

    await notifier.sendMessage(text);
    final chat = ref.read(chatProvider);
    final ChatMessage? lastAssistant = chat.messages.reversed
        .where((m) => !m.isUser)
        .cast<ChatMessage?>()
        .firstOrNull;
    if (lastAssistant != null && lastAssistant.text.isNotEmpty) {
      await _speak(lastAssistant.text);
    }
  }

  Future<void> _speak(String text) async {
    await _tts.stop();
    setState(() {
      _isSpeaking = true;
    });
    await _tts.setLanguage(_ttsLanguageCode);
    await _tts.speak(text);
    if (mounted) {
      setState(() {
        _isSpeaking = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final chat = ref.watch(chatProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Voice Mode (Demo)'),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: ToggleButtons(
              isSelected: [
                _language == VoiceLanguage.english,
                _language == VoiceLanguage.french,
              ],
              onPressed: (index) {
                _setLanguage(
                    index == 0 ? VoiceLanguage.english : VoiceLanguage.french);
              },
              children: const [
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Text('EN'),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: Text('FR'),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: chat.messages.length,
              itemBuilder: (context, index) {
                final msg = chat.messages[index];
                final bg = msg.isUser
                    ? Theme.of(context).colorScheme.primaryContainer
                    : Theme.of(context).colorScheme.surfaceContainerHighest;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Align(
                    alignment: msg.isUser
                        ? Alignment.centerRight
                        : Alignment.centerLeft,
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        maxWidth: MediaQuery.sizeOf(context).width * 0.85,
                      ),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: bg,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(msg.text),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          if (chat.isLoading)
            const LinearProgressIndicator(),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Language: $_languageLabel', textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: !_speechAvailable || chat.isLoading
                      ? null
                      : (_isListening ? _stopListening : _startListening),
                  icon: Icon(
                    _isListening ? Icons.mic : Icons.mic_none,
                  ),
                  label: Text(
                    _isListening
                        ? 'Listening...'
                        : 'Tap to speak ($_languageLabel)',
                  ),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
                if (_isSpeaking)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'Speaking...',
                      textAlign: TextAlign.center,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

