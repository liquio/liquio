const AppInfo = require('./app_info');

/**
 * App ident version.
 */
class AppIdentHeaders {
  /**
   * Add.
   * @param {object} app Express app instance.
   */
  static add(app) {
    // Defoine app info.
    const appInfo = new AppInfo();

    // Set headers.
    app.use(function (req, res, next) {
      res.setHeader('Name', appInfo.name);
      res.setHeader('Version', appInfo.version);
      next();
    });
  }
}

module.exports = AppIdentHeaders;
