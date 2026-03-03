import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/chat_provider.dart';
import '../providers/submission_provider.dart';
import '../services/api_client.dart';

const _apiClient = ApiClient();

class ReviewScreen extends ConsumerStatefulWidget {
  const ReviewScreen({super.key});

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  Map<String, dynamic>? _schema;
  String? _schemaError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSchema());
  }

  Future<void> _loadSchema() async {
    final formId = ref.read(submissionProvider).formId ?? formIds.first;
    try {
      final data = await _apiClient.getForm(formId);
      final schema = data['schema'] as Map<String, dynamic>?;
      if (mounted) {
        setState(() {
          _schema = schema;
          _schemaError = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _schema = null;
          _schemaError = e.toString();
        });
      }
    }
  }

  void _editField(
    BuildContext context, {
    required String key,
    required String label,
    required dynamic currentValue,
  }) {
    final controller = TextEditingController(
      text: currentValue == null || currentValue == ''
          ? ''
          : currentValue.toString(),
    );
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(label),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: 'Value',
          ),
          autofocus: true,
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final value = controller.text.trim();
              final draft = Map<String, dynamic>.from(ref.read(chatProvider).draft);
              if (value.isEmpty) {
                draft.remove(key);
              } else {
                draft[key] = value;
              }
              ref.read(chatProvider.notifier).setDraft(draft);
              Navigator.pop(ctx);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final formId = ref.watch(submissionProvider).formId ?? formIds.first;
    final draft = ref.watch(chatProvider).draft;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Review'),
        actions: [
          DropdownButton<String>(
            value: formId,
            items: formIds.map((id) => DropdownMenuItem(value: id, child: Text(id))).toList(),
            onChanged: (v) {
              if (v != null) {
                ref.read(submissionProvider.notifier).setFormId(v);
                setState(() => _schema = null);
                _loadSchema();
              }
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _schemaError != null
          ? Center(child: Text(_schemaError!, style: TextStyle(color: Theme.of(context).colorScheme.error)))
          : _schema == null
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: _sectionWidgets(_schema!, draft),
                ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: () {
              ref.read(submissionProvider.notifier).setDraft(draft);
              Navigator.pushNamed(context, '/submit');
            },
            child: const Text('Continue to Submit'),
          ),
        ),
      ),
    );
  }

  List<Widget> _sectionWidgets(Map<String, dynamic> schema, Map<String, dynamic> draft) {
    final sections = schema['sections'] as List<dynamic>? ?? [];
    final list = <Widget>[];
    for (final sec in sections) {
      final section = sec as Map<String, dynamic>;
      final title = section['title'] as String? ?? '';
      final fields = section['fields'] as List<dynamic>? ?? [];
      list.add(Padding(
        padding: const EdgeInsets.only(top: 16, bottom: 8),
        child: Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
      ));
      for (final f in fields) {
        final field = f as Map<String, dynamic>;
        final key = field['key'] as String? ?? '';
        final label = field['label'] as String? ?? key;
        final value = draft[key];
        final display = value == null || value == ''
            ? '—'
            : value is bool
                ? (value ? 'Yes' : 'No')
                : value.toString();
        list.add(
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text(label),
              subtitle: Text(display),
              trailing: const Icon(Icons.edit_outlined),
              onTap: () => _editField(context, key: key, label: label, currentValue: value),
            ),
          ),
        );
      }
    }
    return list;
  }
}
