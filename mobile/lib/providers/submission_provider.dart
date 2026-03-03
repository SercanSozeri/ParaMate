import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Form IDs supported by the server.
const List<String> formIds = [
  'OCCURRENCE_REPORT',
  'TEDDY_BEAR',
  'SHIFT_REPORT',
  'STATUS_REPORT',
];

class SubmissionState {
  const SubmissionState({this.formId, this.draft = const {}, this.lastSentPdfBase64});

  final String? formId;
  final Map<String, dynamic> draft;
  final String? lastSentPdfBase64;

  SubmissionState copyWith({
    String? formId,
    Map<String, dynamic>? draft,
    String? lastSentPdfBase64,
  }) {
    return SubmissionState(
      formId: formId ?? this.formId,
      draft: draft ?? this.draft,
      lastSentPdfBase64: lastSentPdfBase64 ?? this.lastSentPdfBase64,
    );
  }
}

class SubmissionNotifier extends StateNotifier<SubmissionState> {
  SubmissionNotifier() : super(const SubmissionState());

  void setFormId(String id) {
    state = state.copyWith(formId: id);
  }

  void setDraft(Map<String, dynamic> draft) {
    state = state.copyWith(draft: draft);
  }

  void setLastSentPdf(String? base64) {
    state = state.copyWith(lastSentPdfBase64: base64);
  }

  void clearPdf() {
    state = state.copyWith(lastSentPdfBase64: null);
  }
}

final submissionProvider =
    StateNotifierProvider<SubmissionNotifier, SubmissionState>((ref) => SubmissionNotifier());
