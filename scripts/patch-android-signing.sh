#!/usr/bin/env bash
# Patches android/app/build.gradle with release signing config.
# Run AFTER `npx expo prebuild --platform android --clean`.
set -euo pipefail

BUILD_GRADLE="android/app/build.gradle"
KEYSTORE="inoffice-release.keystore"

# Copy keystore into android/app (survives prebuild deletion)
cp "$KEYSTORE" "android/app/$KEYSTORE" 2>/dev/null || true

# 1. Insert release signing config after the debug signing config block
#    Matches the closing "}" of the debug config and inserts release config before the "}" that closes signingConfigs
python3 -c "
import re

with open('$BUILD_GRADLE', 'r') as f:
    content = f.read()

# Insert release signing config after the debug signing config block
release_config = '''        release {
            storeFile file('$KEYSTORE')
            storePassword System.getenv('RTO_KEYSTORE_PASSWORD') ?: findProperty('RTO_KEYSTORE_PASSWORD') ?: ''
            keyAlias 'inoffice'
            keyPassword System.getenv('RTO_KEYSTORE_PASSWORD') ?: findProperty('RTO_KEYSTORE_PASSWORD') ?: ''
        }
'''

# Find signingConfigs block and add release after debug (match debug's closing brace)
pattern = r'(signingConfigs \{.*?debug \{.*?\n        \})'
replacement = r'\1\n' + release_config
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Replace signingConfig signingConfigs.debug with release ONLY in the release build type
content = re.sub(
    r'(\s+release \{\s*\n\s+//.*?\n\s+)signingConfig signingConfigs\.debug',
    r'\1signingConfig signingConfigs.release',
    content,
    flags=re.DOTALL
)

with open('$BUILD_GRADLE', 'w') as f:
    f.write(content)

print('Signing config patched successfully')
"
