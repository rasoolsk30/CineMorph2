# CineMorph AI – Permission Setup

## What changed
- First launch now shows a short permission setup introduction.
- The home screen includes an App Permissions panel with current OS permission status.
- Video & library access uses Android's runtime READ_MEDIA_VIDEO (Android 13+) or READ_EXTERNAL_STORAGE (Android 12 and below) permission. This is required for the in-app automatic video library.
- Microphone uses RECORD_AUDIO and is optional. The user can grant it from the panel; voice controls still request it when used if it was not granted earlier.
- Notifications are shown as Not needed because this app version does not currently post notifications. No POST_NOTIFICATIONS permission is declared or requested.
- The app does not request all-files access, contacts, location, camera, or unrelated permissions. Android does not permit an app to silently grant permissions; the user must approve each OS dialog.

## Notes
- Users can change/revoke permissions later from Android Settings > Apps > CineMorph AI > Permissions.
- The app continues to support the system document picker for manually selecting a video/subtitle; picker access does not require broad storage permission.
- Permission requests and device behavior still require Android Studio build and real-device testing.
