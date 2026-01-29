// Authentication removed for simplified development mode.
// Export permissive middleware so routes depending on `auth`/`optionalAuth`
// continue to work without requiring tokens.

function auth(req, res, next) {
  req.user = null;
  next();
}

function optionalAuth(req, res, next) {
  req.user = null;
  next();
}

module.exports = { auth, optionalAuth };
