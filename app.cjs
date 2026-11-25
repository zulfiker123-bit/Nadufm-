// CommonJS entry wrapper for shared hosting (cPanel Phusion Passenger / lsnode)
// that loads the ESM application from server.js without ERR_REQUIRE_ESM.
import('./server.js').catch((err) => {
  console.error('Failed to start Madrasah portal server:', err);
  process.exit(1);
});
