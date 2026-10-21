package com.simplecalc.permissionaudit

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Read-only Android permission & settings audit for Nazar. Requests NO permissions.
 *
 * Everything here is information Android exposes to an ordinary app:
 *   - the app's OWN requested permissions and whether each is granted;
 *   - a few read-only Settings flags (developer options, USB debugging, overlay for this app);
 *   - the device-wide lists of enabled accessibility services, notification-listener services,
 *     and active device-admin apps — the permission classes stalkerware most often abuses.
 *
 * What it deliberately does NOT do: enumerate other installed apps or their permissions (that needs
 * the policy-restricted QUERY_ALL_PACKAGES, which a disguised safety app must not request), claim
 * that any listed service is spyware, or upload anything. Every field is read in its own try/catch
 * so a single failure yields null/empty instead of breaking the whole audit.
 */
class PermissionAuditModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context unavailable" }

  override fun definition() = ModuleDefinition {
    Name("PermissionAudit")

    // Present on this native build. On web / Expo Go the JS side never gets here (the module is null).
    Function("isAvailable") { true }

    AsyncFunction("getAudit") { buildAudit() }
  }

  private fun buildAudit(): Map<String, Any?> {
    val cr = context.contentResolver
    val pm = context.packageManager
    val pkg = context.packageName

    // (1) This app's own permissions — directly verified.
    val selfPermissions = mutableListOf<Map<String, Any?>>()
    try {
      val info = pm.getPackageInfo(pkg, PackageManager.GET_PERMISSIONS)
      info.requestedPermissions?.forEach { perm ->
        val granted = context.checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED
        selfPermissions.add(mapOf("name" to perm, "granted" to granted))
      }
    } catch (_: Exception) {
      // Leave the list empty; the JS side treats empty as "couldn't read".
    }

    return mapOf(
      "platform" to "android",
      "androidSdkInt" to Build.VERSION.SDK_INT,
      "appId" to pkg,
      "selfPermissions" to selfPermissions,
      "developerOptionsEnabled" to globalFlag(cr, Settings.Global.DEVELOPMENT_SETTINGS_ENABLED),
      "adbEnabled" to globalFlag(cr, Settings.Global.ADB_ENABLED),
      "enabledAccessibilityServices" to secureList(cr, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES),
      // String literal: the public Settings.Secure constant for this key is not stable API.
      "enabledNotificationListeners" to secureList(cr, "enabled_notification_listeners"),
      "activeDeviceAdmins" to activeAdmins(),
      "canDrawOverlaysSelf" to overlaySelf()
    )
  }

  /** A Settings.Global int flag as a Boolean, or null if it can't be read. */
  private fun globalFlag(cr: android.content.ContentResolver, key: String): Boolean? =
    try {
      Settings.Global.getInt(cr, key, 0) == 1
    } catch (_: Exception) {
      null
    }

  /** A colon/newline-separated Settings.Secure list as component strings (empty if unset/unreadable). */
  private fun secureList(cr: android.content.ContentResolver, key: String): List<String> =
    try {
      Settings.Secure.getString(cr, key)
        ?.split(':', '\n')
        ?.map { it.trim() }
        ?.filter { it.isNotEmpty() }
        ?: emptyList()
    } catch (_: Exception) {
      emptyList()
    }

  private fun activeAdmins(): List<String> =
    try {
      val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
      dpm.activeAdmins?.map { it.flattenToString() } ?: emptyList()
    } catch (_: Exception) {
      emptyList()
    }

  private fun overlaySelf(): Boolean? =
    try {
      Settings.canDrawOverlays(context)
    } catch (_: Exception) {
      null
    }
}
