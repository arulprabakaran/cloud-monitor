'use strict';
const path = require('path');
const { app, BrowserWindow, ipcMain, Notification } = require('electron');
/// const {autoUpdater} = require('electron-updater');
const { is } = require('electron-util');
const getCertificate = require('./GetCertificate');
const DataStore = require('./DataStore');

try {
	require('electron-reloader')(module);
} catch (_) { }

const monitorData = new DataStore({ name: 'Monitors' })

// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }

// Prevent window from being garbage collected
let mainWindow, addWebsiteWin;

const createMainWindow = async () => {
	const win = new BrowserWindow({
		title: app.name,
		show: false,
		width: 900,
		height: 700,
		resizable: false,
		webPreferences: {
			//devTools: true,
			nodeIntegration: true
		}
	});

	win.on('ready-to-show', () => {
		win.show();
		setTimeout(() => {
			win.webContents.send('websites', monitorData.websites)
		}, 1);
	});

	win.on('closed', () => {
		// Dereference the window
		// For multiple windows store them in an array
		mainWindow = undefined;
	});

	win.removeMenu();
	//win.setAlwaysOnTop(true);

	await win.loadFile(path.join(__dirname, 'renderer/index.html'));

	return win;
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on('second-instance', () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}
		mainWindow.show();
	}
});

app.on('window-all-closed', () => {
	if (!is.macos) {
		app.quit();
	}
});

app.on('activate', async () => {
	if (!mainWindow) {
		mainWindow = await createMainWindow();
	}
});

function get_days_left(date_string) {
    var now = Date.now();
    var then = new Date(Date.parse(date_string));
    var days_left = Math.round((then - now) / 86400000);
    return days_left;
};

(async () => {
	await app.whenReady();
	mainWindow = await createMainWindow();

	let expiringWebsites = monitorData.websites.filter(website => {return get_days_left(website.info.valid_to) < 21}).length

	if (expiringWebsites > 0) {
		new Notification({
			title: "Expiring / Expired Monitors",
			body: `${expiringWebsites} monitor${expiringWebsites == 1 ? "" : "s"} needs your attention.`
		}).show();
	}

	ipcMain.on("get-websites", (event) => {
		mainWindow.send('websites', monitorData.websites);
	})

	// add-website
	ipcMain.on('add-website', (event, website) => {

		const websiteExists = monitorData.websites.filter(item => {
			return item.server == website.host
		});

		if(websiteExists.length > 0) {
			mainWindow.send("website-exists");
		} else {

			getCertificate(website.host)
				.then(data => {
					if(data.errorCode) {
						mainWindow.send('website-error', data);
					} else {
						data.name = website.name;
						const updatedWebsites = monitorData.addWebsite(data).websites
						mainWindow.send('websites', updatedWebsites);
					}
				// })
				// .catch(err => {
				// 	console.log(err);
				// 	mainWindow.send('websites', err);
				});

		}
	})

	// delete-website
	ipcMain.on('delete-website', (event, hostname) => {

		const website = monitorData.websites.filter(item => {
			return item.server == hostname
		});

		if(website.length > 0) {
			const updatedWebsites = monitorData.deleteWebsite(website[0]).websites
			mainWindow.send('websites', updatedWebsites)
		}
	})

	// update-website
	ipcMain.on('refresh-website', (event, hostname) => {

		const website = monitorData.getWebsite(hostname);

		console.log(website);
		getCertificate(website.server)
			.then(data => {
				if(!data.errorCode) {
					data.name = website.name;
					const updatedWebsites = monitorData.updateWebsite(data).websites
					mainWindow.send('websites', updatedWebsites);
				}
			});

	})

})();
