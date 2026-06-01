package expo.modules.cloudbackup

import android.accounts.AccountManager
import android.content.Context
import android.os.Environment
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

class CloudBackupModule : Module() {
  private val backupDir = "InOfficeBackups"
  private val driveFolderName = "InOfficeBackups"
  private val scope = CoroutineScope(Dispatchers.IO)

  override fun definition() = ModuleDefinition {
    Name("CloudBackup")

    Function("isCloudAvailable") {
      return@Function getGoogleAccount() != null
    }

    AsyncFunction("uploadBackup") { localPath: String, fileName: String, promise: Promise ->
      scope.launch {
        try {
          uploadToGoogleDrive(localPath, fileName, promise)
        } catch (e: Exception) {
          promise.reject("UPLOAD_FAILED", e.message ?: "Upload failed")
        }
      }
    }

    AsyncFunction("downloadBackup") { fileName: String, localDir: String, promise: Promise ->
      scope.launch {
        try {
          downloadFromGoogleDrive(fileName, localDir, promise)
        } catch (e: Exception) {
          promise.reject("DOWNLOAD_FAILED", e.message ?: "Download failed")
        }
      }
    }

    AsyncFunction("listBackups") { promise: Promise ->
      scope.launch {
        try {
          val backups = listGoogleDriveBackups()
          promise.resolve(backups)
        } catch (e: Exception) {
          promise.resolve(ArrayList<String>())
        }
      }
    }

    AsyncFunction("deleteBackup") { fileName: String, promise: Promise ->
      scope.launch {
        try {
          deleteGoogleDriveBackup(fileName, promise)
        } catch (e: Exception) {
          promise.reject("DELETE_FAILED", e.message ?: "Delete failed")
        }
      }
    }
  }

  private fun getContext(): Context {
    return appContext.reactContext ?: throw IllegalStateException("React context not available")
  }

  private fun getGoogleAccount(): android.accounts.Account? {
    try {
      val accountManager = AccountManager.get(getContext())
      val accounts = accountManager.getAccountsByType("com.google")
      return if (accounts.isNotEmpty()) accounts[0] else null
    } catch (e: Exception) {
      return null
    }
  }

  private suspend fun getAuthToken(): String {
    val account = getGoogleAccount()
      ?: throw Exception("No Google account found. Please add a Google account in Settings.")

    return withContext(Dispatchers.IO) {
      val accountManager = AccountManager.get(getContext())
      val token = accountManager.blockingGetAuthToken(
        account,
        "oauth2:https://www.googleapis.com/auth/drive.file",
        true
      )
      token ?: throw Exception("Failed to get auth token")
    }
  }

  private fun saveBackupLocally(localPath: String, fileName: String): File {
    val backupDir = File(getContext().getExternalFilesDir(null), backupDir)
    if (!backupDir.exists()) backupDir.mkdirs()

    val localFile = File(localPath)
    val destFile = File(backupDir, fileName)
    localFile.copyTo(destFile, overwrite = true)
    return destFile
  }

  private suspend fun uploadToGoogleDrive(localPath: String, fileName: String, promise: Promise) {
    try {
      val token = getAuthToken()
      val localFile = saveBackupLocally(localPath, fileName)

      val metadata = JSONObject().apply {
        put("name", fileName)
        put("parents", JSONArray().apply {
          put(getOrCreateDriveFolder(token))
        })
      }

      val boundary = "Boundary_${System.currentTimeMillis()}"
      val lineEnd = "\r\n"

      val requestBody = StringBuilder().apply {
        append("--${boundary}${lineEnd}")
        append("Content-Type: application/json; charset=UTF-8${lineEnd}")
        append(lineEnd)
        append(metadata.toString())
        append(lineEnd)
        append("--${boundary}${lineEnd}")
        append("Content-Type: application/octet-stream${lineEnd}")
        append(lineEnd)
      }

      val fileBytes = localFile.readBytes()
      val bodyStart = requestBody.toString().toByteArray()
      val bodyEnd = "${lineEnd}--${boundary}--${lineEnd}".toByteArray()

      val url = URL("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")
      val connection = url.openConnection() as HttpURLConnection
      connection.requestMethod = "POST"
      connection.setRequestProperty("Authorization", "Bearer $token")
      connection.setRequestProperty("Content-Type", "multipart/related; boundary=$boundary")
      connection.doOutput = true

      connection.outputStream.use { os ->
        os.write(bodyStart)
        os.write(fileBytes)
        os.write(bodyEnd)
      }

      val responseCode = connection.responseCode
      if (responseCode in 200..299) {
        cleanupOldDriveBackups(token, fileName)
        promise.resolve(fileName)
      } else {
        val error = connection.errorStream?.bufferedReader()?.readText() ?: "Unknown error"
        promise.reject("UPLOAD_FAILED", "HTTP $responseCode: $error")
      }
      connection.disconnect()
    } catch (e: Exception) {
      promise.reject("UPLOAD_FAILED", e.message ?: "Upload failed")
    }
  }

  private suspend fun getOrCreateDriveFolder(token: String): String {
    val query = "name='$driveFolderName' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    val url = URL("https://www.googleapis.com/drive/v3/files?q=${java.net.URLEncoder.encode(query, "UTF-8")}")
    val connection = url.openConnection() as HttpURLConnection
    connection.setRequestProperty("Authorization", "Bearer $token")

    val response = connection.inputStream.bufferedReader().readText()
    connection.disconnect()

    val json = JSONObject(response)
    val files = json.getJSONArray("files")
    if (files.length() > 0) {
      return files.getJSONObject(0).getString("id")
    }

    val metadata = JSONObject().apply {
      put("name", driveFolderName)
      put("mimeType", "application/vnd.google-apps.folder")
    }

    val createUrl = URL("https://www.googleapis.com/drive/v3/files")
    val createConn = createUrl.openConnection() as HttpURLConnection
    createConn.requestMethod = "POST"
    createConn.setRequestProperty("Authorization", "Bearer $token")
    createConn.setRequestProperty("Content-Type", "application/json")
    createConn.doOutput = true
    createConn.outputStream.write(metadata.toString().toByteArray())

    val createResponse = createConn.inputStream.bufferedReader().readText()
    createConn.disconnect()

    return JSONObject(createResponse).getString("id")
  }

  private suspend fun listGoogleDriveBackups(): List<String> {
    try {
      val token = getAuthToken()
      val folderId = try {
        getOrCreateDriveFolder(token)
      } catch (e: Exception) {
        return emptyList()
      }

      val query = "'$folderId' in parents and trashed=false"
      val url = URL("https://www.googleapis.com/drive/v3/files?q=${java.net.URLEncoder.encode(query, "UTF-8")}&orderBy=createdTime desc")
      val connection = url.openConnection() as HttpURLConnection
      connection.setRequestProperty("Authorization", "Bearer $token")

      val response = connection.inputStream.bufferedReader().readText()
      connection.disconnect()

      val json = JSONObject(response)
      val files = json.getJSONArray("files")
      val backups = mutableListOf<String>()
      for (i in 0 until files.length()) {
        backups.add(files.getJSONObject(i).getString("name"))
      }
      return backups
    } catch (e: Exception) {
      return emptyList()
    }
  }

  private suspend fun downloadFromGoogleDrive(fileName: String, localDir: String, promise: Promise) {
    try {
      val token = getAuthToken()

      val query = "name='$fileName' and trashed=false"
      val searchUrl = URL("https://www.googleapis.com/drive/v3/files?q=${java.net.URLEncoder.encode(query, "UTF-8")}")
      val searchConn = searchUrl.openConnection() as HttpURLConnection
      searchConn.setRequestProperty("Authorization", "Bearer $token")

      val searchResponse = searchConn.inputStream.bufferedReader().readText()
      searchConn.disconnect()

      val files = JSONObject(searchResponse).getJSONArray("files")
      if (files.length() == 0) {
        promise.reject("NOT_FOUND", "Backup file not found")
        return
      }

      val fileId = files.getJSONObject(0).getString("id")
      val downloadUrl = URL("https://www.googleapis.com/drive/v3/files/$fileId?alt=media")
      val downloadConn = downloadUrl.openConnection() as HttpURLConnection
      downloadConn.setRequestProperty("Authorization", "Bearer $token")

      val destFile = File(localDir, fileName)
      downloadConn.inputStream.use { input ->
        FileOutputStream(destFile).use { output ->
          input.copyTo(output)
        }
      }
      downloadConn.disconnect()

      promise.resolve(destFile.absolutePath)
    } catch (e: Exception) {
      promise.reject("DOWNLOAD_FAILED", e.message ?: "Download failed")
    }
  }

  private suspend fun deleteGoogleDriveBackup(fileName: String, promise: Promise) {
    try {
      val token = getAuthToken()

      val query = "name='$fileName' and trashed=false"
      val url = URL("https://www.googleapis.com/drive/v3/files?q=${java.net.URLEncoder.encode(query, "UTF-8")}")
      val connection = url.openConnection() as HttpURLConnection
      connection.setRequestProperty("Authorization", "Bearer $token")

      val response = connection.inputStream.bufferedReader().readText()
      connection.disconnect()

      val files = JSONObject(response).getJSONArray("files")
      if (files.length() > 0) {
        val fileId = files.getJSONObject(0).getString("id")
        val deleteUrl = URL("https://www.googleapis.com/drive/v3/files/$fileId")
        val deleteConn = deleteUrl.openConnection() as HttpURLConnection
        deleteConn.requestMethod = "DELETE"
        deleteConn.setRequestProperty("Authorization", "Bearer $token")
        deleteConn.responseCode
        deleteConn.disconnect()
      }
      promise.resolve()
    } catch (e: Exception) {
      promise.reject("DELETE_FAILED", e.message ?: "Delete failed")
    }
  }

  private suspend fun cleanupOldDriveBackups(token: String, currentFileName: String) {
    try {
      val allBackups = listGoogleDriveBackups()
      val backupFiles = allBackups.filter { it.startsWith("inoffice_backup_") }
        .sortedDescending()

      if (backupFiles.size > 3) {
        val toDelete = backupFiles.drop(3)
        for (oldFile in toDelete) {
          val query = "name='$oldFile' and trashed=false"
          val url = URL("https://www.googleapis.com/drive/v3/files?q=${java.net.URLEncoder.encode(query, "UTF-8")}")
          val connection = url.openConnection() as HttpURLConnection
          connection.setRequestProperty("Authorization", "Bearer $token")

          val response = connection.inputStream.bufferedReader().readText()
          connection.disconnect()

          val files = JSONObject(response).getJSONArray("files")
          if (files.length() > 0) {
            val fileId = files.getJSONObject(0).getString("id")
            val deleteUrl = URL("https://www.googleapis.com/drive/v3/files/$fileId")
            val deleteConn = deleteUrl.openConnection() as HttpURLConnection
            deleteConn.requestMethod = "DELETE"
            deleteConn.setRequestProperty("Authorization", "Bearer $token")
            deleteConn.responseCode
            deleteConn.disconnect()
          }
        }
      }
    } catch (_: Exception) {
    }
  }
}
