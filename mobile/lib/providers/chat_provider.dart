import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../models/chat_message.dart';
import '../services/api_client.dart';

const _apiClient = ApiClient();
const _uuid = Uuid();

class ChatState {
  const ChatState({
    this.messages = const [],
    this.draft = const {},
    this.missingRequiredFields = const [],
    this.isComplete = false,
    this.sessionId,
    this.isLoading = false,
    this.error,
  });

  final List<ChatMessage> messages;
  final Map<String, dynamic> draft;
  final List<dynamic> missingRequiredFields;
  final bool isComplete;
  final String? sessionId;
  final bool isLoading;
  final String? error;

  ChatState copyWith({
    List<ChatMessage>? messages,
    Map<String, dynamic>? draft,
    List<dynamic>? missingRequiredFields,
    bool? isComplete,
    String? sessionId,
    bool? isLoading,
    String? error,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      draft: draft ?? this.draft,
      missingRequiredFields: missingRequiredFields ?? this.missingRequiredFields,
      isComplete: isComplete ?? this.isComplete,
      sessionId: sessionId ?? this.sessionId,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class ChatNotifier extends StateNotifier<ChatState> {
  ChatNotifier() : super(const ChatState());

  Future<void> sendMessage(String text) async {
    final message = text.trim();
    if (message.isEmpty) return;

    if (state.sessionId == null) {
      state = state.copyWith(sessionId: _uuid.v4());
    }
    final sessionId = state.sessionId!;

    state = state.copyWith(
      messages: [...state.messages, ChatMessage(isUser: true, text: message)],
      isLoading: true,
      error: null,
    );

    try {
      final result = await _apiClient.postChat(
        sessionId: sessionId,
        message: message,
      );
      final assistantMessage = result['assistantMessage'] as String? ?? '';
      final updatedDraft = Map<String, dynamic>.from(
        (result['updatedDraft'] as Map<dynamic, dynamic>?) ?? {},
      );
      final missing = result['missingRequiredFields'] as List<dynamic>? ?? [];
      final complete = result['isComplete'] as bool? ?? false;

      state = state.copyWith(
        messages: [
          ...state.messages,
          ChatMessage(isUser: false, text: assistantMessage),
        ],
        draft: updatedDraft,
        missingRequiredFields: missing,
        isComplete: complete,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> showSummary() async {
    await sendMessage('Show summary');
  }

  void clearSession() {
    state = ChatState(sessionId: _uuid.v4());
  }

  void setDraft(Map<String, dynamic> draft) {
    state = state.copyWith(draft: draft);
  }
}

final chatProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  return ChatNotifier();
});
