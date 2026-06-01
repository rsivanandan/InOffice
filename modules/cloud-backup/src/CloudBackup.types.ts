import { Platform } from "react-native";

export interface CloudBackupModule {
  isCloudAvailable(): Promise<boolean>;
  uploadBackup(localPath: string, fileName: string): Promise<string>;
  downloadBackup(fileName: string, localDir: string): Promise<string>;
  listBackups(): Promise<string[]>;
  deleteBackup(fileName: string): Promise<void>;
}

let module: CloudBackupModule | null = null;

try {
  module = require("expo-modules-core").requireNativeModule("CloudBackup");
} catch {
}

export function getCloudModule(): CloudBackupModule | null {
  return module;
}

export function isCloudAvailable(): Promise<boolean> {
  if (!module) return Promise.resolve(false);
  return module.isCloudAvailable();
}
