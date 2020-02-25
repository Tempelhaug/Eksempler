/**
 * Entrypoint for the app, initializes all required scripts for startup
 * @module App
 */
// App setup
import 'airbnb-browser-shims';
import 'jquery';
import 'popper.js';
import 'bootstrap';
import 'mdbootstrap-pro/js/mdb';

// Helpers
import './components/translation';
import './components/dataFunctions';

// Initialize the app
import './views/init';

// Views
import './views/login';
import './views/register';
import './views/gps';

// Purchases
import './views/purchase';

// Menus
import './views/bottomNav';
import './views/sideNav';
