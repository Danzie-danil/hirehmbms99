const fs = require('fs');
const path = require('path');

const iconPath = path.join(__dirname, '..', 'bms_logo_official.png');
const base64Str = fs.readFileSync(iconPath).toString('base64');

// Update js/logoBase64.js
const logoJsPath = path.join(__dirname, '..', 'js', 'logoBase64.js');
fs.writeFileSync(logoJsPath, `export const iconBase64 = "${base64Str}";\n`);

// Update public/bmstz.mobileconfig
const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>FullScreen</key>
			<true/>
			<key>Icon</key>
			<data>
${base64Str}
			</data>
			<key>IsRemovable</key>
			<true/>
			<key>Label</key>
			<string>BMSTz</string>
			<key>PayloadDescription</key>
			<string>BMSTz Business Management System Web App</string>
			<key>PayloadDisplayName</key>
			<string>BMSTz Web Clip</string>
			<key>PayloadIdentifier</key>
			<string>com.bmstz.app.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>a3c9e4b1-8d2f-4e9b-9c7a-1f8d9e0b2c3d</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>Precomposed</key>
			<true/>
			<key>URL</key>
			<string>https://bmstz.vercel.app/app/</string>
		</dict>
	</array>
	<key>PayloadDisplayName</key>
	<string>BMSTz Web App</string>
	<key>PayloadIdentifier</key>
	<string>com.bmstz.app.profile</string>
	<key>PayloadOrganization</key>
	<string>BMSTz</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>b4d0f5c2-9e3a-5f0c-ad8b-2e9ea1c3d4e5</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>`;

const mobileConfigPath = path.join(__dirname, '..', 'public', 'bmstz.mobileconfig');
fs.writeFileSync(mobileConfigPath, xmlContent);
console.log('Successfully updated bmstz.mobileconfig and js/logoBase64.js with icon Base64 data!');
