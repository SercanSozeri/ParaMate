import 'dart:convert';
import 'package:http/http.dart' as http;

const String baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

class ApiClient {
  const ApiClient();

  Future<Map<String, dynamic>> getHealth() async {
    final uri = Uri.parse('$baseUrl/health');
    final response = await http.get(uri);

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to get health (status ${response.statusCode})');
    }
  }

  /// POST /chat. Body: { sessionId, message }. Returns { assistantMessage, updatedDraft, missingRequiredFields, isComplete }.
  Future<Map<String, dynamic>> postChat({
    required String sessionId,
    required String message,
  }) async {
    final uri = Uri.parse('$baseUrl/chat');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'sessionId': sessionId, 'message': message}),
    );

    if (response.statusCode != 200) {
      final body = response.body;
      throw Exception(body.isNotEmpty ? body : 'Chat failed (${response.statusCode})');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  /// GET /forms/:id. Returns { metadata, schema } with sections and fields.
  Future<Map<String, dynamic>> getForm(String formId) async {
    final uri = Uri.parse('$baseUrl/forms/$formId');
    final response = await http.get(uri);
    if (response.statusCode != 200) {
      throw Exception('Form not found (${response.statusCode})');
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  /// POST /render. Body: { formId, draft }. Returns { pdf } or { pdfBase64, xmlString } for TEDDY_BEAR.
  Future<Map<String, dynamic>> postRender({
    required String formId,
    required Map<String, dynamic> draft,
  }) async {
    final uri = Uri.parse('$baseUrl/render');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'formId': formId, 'draft': draft}),
    );
    if (response.statusCode != 200) {
      throw Exception(response.body.isNotEmpty ? response.body : 'Render failed');
    }
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (data.containsKey('pdfBase64')) {
      data['pdf'] = data['pdfBase64'];
    }
    return data;
  }

  /// POST /send. Body: { formId, draft, targetEmail }. Returns { success: true } or error.
  Future<Map<String, dynamic>> postSend({
    required String formId,
    required Map<String, dynamic> draft,
    required String targetEmail,
  }) async {
    final uri = Uri.parse('$baseUrl/send');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'formId': formId,
        'draft': draft,
        'targetEmail': targetEmail,
      }),
    );
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      throw Exception(data['error'] as String? ?? 'Send failed');
    }
    return data;
  }
}

