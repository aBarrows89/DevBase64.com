import { execSync } from "child_process";

/**
 * ADB wrapper for scanner setup operations.
 */

export function checkAdb(): boolean {
  try {
    execSync("adb version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function restartAdbServer(): void {
  execSync("adb kill-server", { stdio: "pipe" });
  execSync("adb start-server", { stdio: "pipe" });
}

export interface AdbDevice {
  serial: string;
  state: string; // "device" | "unauthorized" | "offline"
}

export function listDevices(): AdbDevice[] {
  const output = execSync("adb devices", { encoding: "utf-8" });
  return output
    .split("\n")
    .slice(1) // Skip "List of devices attached"
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [serial, state] = line.trim().split(/\s+/);
      return { serial, state };
    });
}

export function getDeviceSerial(adbSerial: string): string {
  return execSync(`adb -s ${adbSerial} shell getprop ro.serialno`, {
    encoding: "utf-8",
  }).trim();
}

export function getDeviceModel(adbSerial: string): string {
  return execSync(`adb -s ${adbSerial} shell getprop ro.product.model`, {
    encoding: "utf-8",
  }).trim();
}

export function getAndroidVersion(adbSerial: string): string {
  return execSync(`adb -s ${adbSerial} shell getprop ro.build.version.release`, {
    encoding: "utf-8",
  }).trim();
}

export function installApk(adbSerial: string, apkPath: string): boolean {
  try {
    execSync(`adb -s ${adbSerial} install -r "${apkPath}"`, { stdio: "pipe" });
    return true;
  } catch {
    // Try uninstall + install
    try {
      const pkg = getApkPackage(apkPath);
      if (pkg) execSync(`adb -s ${adbSerial} uninstall ${pkg}`, { stdio: "pipe" });
      execSync(`adb -s ${adbSerial} install "${apkPath}"`, { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }
}

function getApkPackage(_apkPath: string): string | null {
  // Would use aapt to read package name, simplified for now
  return null;
}

export function pushFile(adbSerial: string, localPath: string, remotePath: string): boolean {
  try {
    execSync(`adb -s ${adbSerial} push "${localPath}" "${remotePath}"`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function shellCommand(adbSerial: string, command: string): string {
  return execSync(`adb -s ${adbSerial} shell ${command}`, {
    encoding: "utf-8",
  }).trim();
}

export function grantPermission(adbSerial: string, pkg: string, permission: string): void {
  try {
    execSync(`adb -s ${adbSerial} shell pm grant ${pkg} ${permission}`, { stdio: "pipe" });
  } catch { /* may fail if permission already granted or not applicable */ }
}

export function disablePackage(adbSerial: string, pkg: string): boolean {
  try {
    const result = execSync(`adb -s ${adbSerial} shell pm disable-user --user 0 ${pkg}`, {
      encoding: "utf-8",
    });
    return result.includes("disabled");
  } catch {
    return false;
  }
}

export function setScreenTimeout(adbSerial: string, ms: number): void {
  shellCommand(adbSerial, `settings put system screen_off_timeout ${ms}`);
}

export function setAutoRotate(adbSerial: string, enabled: boolean): void {
  shellCommand(adbSerial, `settings put system accelerometer_rotation ${enabled ? 1 : 0}`);
}

export function mkdir(adbSerial: string, path: string): void {
  try {
    shellCommand(adbSerial, `mkdir -p '${path}'`);
  } catch { /* may already exist */ }
}
