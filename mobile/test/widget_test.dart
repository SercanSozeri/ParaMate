import 'package:flutter_test/flutter_test.dart';
import 'package:paramate/main.dart';

void main() {
  testWidgets('HomeScreen shows title and Check Server Health button', (WidgetTester tester) async {
    await tester.pumpWidget(const ParaMateApp());

    expect(find.text('ParaMate – AI Paramedic Assistant'), findsWidgets);
    expect(find.text('Check Server Health'), findsOneWidget);
  });
}
