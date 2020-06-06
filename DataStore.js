'use strict'

const Store = require('electron-store')

class DataStore extends Store {
  constructor (settings) {
    super(settings)

    // initialize with websites or empty array
    this.websites = this.get('websites') || []
  }

  saveWebsites () {
    // save websites to JSON file
    this.set('websites', this.websites)

    // returning 'this' allows method chaining
    return this
  }

  getWebsites () {
    // set object's websites to websites in JSON file
    this.websites = this.get('websites') || []

    return this
  }

  getWebsite (server) {
    return this.websites.filter(t => t.server === server)[0]
  }

  addWebsite (website) {
    // merge the existing websites with the new website
    this.websites = [ ...this.websites, website ]

    return this.saveWebsites()
  }

  updateWebsite (website) {
    let websiteIndex = this.websites.findIndex(t => t.server === website.server);
    this.websites[websiteIndex] = website;
    return this.saveWebsites()
  }

  deleteWebsite (website) {
    // filter out the target website
    this.websites = this.websites.filter(t => t !== website)

    return this.saveWebsites()
  }
}

module.exports = DataStore
