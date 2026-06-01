import ExpoModulesCore
import Foundation

public class CloudBackupModule: Module {
  private let backupDir = "InOfficeBackups"

  public func definition() -> ModuleDefinition {
    Name("CloudBackup")

    Function("isCloudAvailable") { () -> Bool in
      guard let _ = FileManager.default.ubiquityIdentityToken else {
        return false
      }
      return true
    }

    AsyncFunction("uploadBackup") { (localPath: String, fileName: String, promise: Promise) in
      do {
        guard let containerURL = FileManager.default.url(
          forUbiquityContainerIdentifier: nil
        ) else {
          promise.reject("CLOUD_UNAVAILABLE", "iCloud Drive is not available")
          return
        }

        let backupFolder = containerURL.appendingPathComponent(self.backupDir, isDirectory: true)
        try FileManager.default.createDirectory(at: backupFolder, withIntermediateDirectories: true)

        let localURL = URL(fileURLWithPath: localPath)
        let destURL = backupFolder.appendingPathComponent(fileName)

        let fileCoordinator = NSFileCoordinator()
        var coordinationError: NSError?

        fileCoordinator.coordinate(writingItemAt: backupFolder, options: .forMerging, error: &coordinationError) { writingURL in
          do {
            if FileManager.default.fileExists(atPath: destURL.path) {
              try FileManager.default.removeItem(at: destURL)
            }
            try FileManager.default.copyItem(at: localURL, to: destURL)
            promise.resolve(destURL.lastPathComponent)
          } catch {
            promise.reject("UPLOAD_FAILED", error.localizedDescription)
          }
        }

        if let error = coordinationError {
          promise.reject("COORDINATION_ERROR", error.localizedDescription)
        }
      } catch {
        promise.reject("UPLOAD_FAILED", error.localizedDescription)
      }
    }

    AsyncFunction("downloadBackup") { (fileName: String, localDir: String, promise: Promise) in
      do {
        guard let containerURL = FileManager.default.url(
          forUbiquityContainerIdentifier: nil
        ) else {
          promise.reject("CLOUD_UNAVAILABLE", "iCloud Drive is not available")
          return
        }

        let sourceURL = containerURL
          .appendingPathComponent(self.backupDir)
          .appendingPathComponent(fileName)
        let destURL = URL(fileURLWithPath: localDir).appendingPathComponent(fileName)

        if FileManager.default.fileExists(atPath: destURL.path) {
          try FileManager.default.removeItem(at: destURL)
        }

        var downloadError: NSError?
        let fileCoordinator = NSFileCoordinator()
        fileCoordinator.coordinate(readingItemAt: sourceURL, options: .withoutChanges, error: &downloadError) { readingURL in
          do {
            try FileManager.default.copyItem(at: readingURL, to: destURL)
            promise.resolve(destURL.path)
          } catch {
            promise.reject("DOWNLOAD_FAILED", error.localizedDescription)
          }
        }

        if let error = downloadError {
          promise.reject("DOWNLOAD_FAILED", error.localizedDescription)
        }
      } catch {
        promise.reject("DOWNLOAD_FAILED", error.localizedDescription)
      }
    }

    AsyncFunction("listBackups") { (promise: Promise) in
      do {
        guard let containerURL = FileManager.default.url(
          forUbiquityContainerIdentifier: nil
        ) else {
          promise.resolve([])
          return
        }

        let backupFolder = containerURL.appendingPathComponent(self.backupDir)
        guard FileManager.default.fileExists(atPath: backupFolder.path) else {
          promise.resolve([])
          return
        }

        let contents = try FileManager.default.contentsOfDirectory(
          at: backupFolder,
          includingPropertiesForKeys: [.creationDateKey, .contentModificationDateKey],
          options: .skipsHiddenFiles
        )

        let backups = contents
          .filter { $0.lastPathComponent.hasPrefix("inoffice_backup_") }
          .sorted { a, b in
            let dateA = (try? a.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast
            let dateB = (try? b.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast
            return dateA > dateB
          }
          .map { $0.lastPathComponent }

        promise.resolve(backups)
      } catch {
        promise.resolve([])
      }
    }

    AsyncFunction("deleteBackup") { (fileName: String, promise: Promise) in
      do {
        guard let containerURL = FileManager.default.url(
          forUbiquityContainerIdentifier: nil
        ) else {
          promise.reject("CLOUD_UNAVAILABLE", "iCloud Drive is not available")
          return
        }

        let fileURL = containerURL
          .appendingPathComponent(self.backupDir)
          .appendingPathComponent(fileName)

        if FileManager.default.fileExists(atPath: fileURL.path) {
          try FileManager.default.removeItem(at: fileURL)
        }
        promise.resolve()
      } catch {
        promise.reject("DELETE_FAILED", error.localizedDescription)
      }
    }
  }
}
