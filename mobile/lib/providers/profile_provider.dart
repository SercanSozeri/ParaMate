import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfileState {
  const ProfileState({this.defaultEmail = ''});
  final String defaultEmail;
  ProfileState copyWith({String? defaultEmail}) =>
      ProfileState(defaultEmail: defaultEmail ?? this.defaultEmail);
}

class ProfileNotifier extends StateNotifier<ProfileState> {
  ProfileNotifier() : super(const ProfileState());

  void setDefaultEmail(String email) {
    state = state.copyWith(defaultEmail: email.trim());
  }
}

final profileProvider =
    StateNotifierProvider<ProfileNotifier, ProfileState>((ref) => ProfileNotifier());
