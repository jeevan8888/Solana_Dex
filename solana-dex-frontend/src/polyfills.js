// src/polyfills.js

import 'buffer';
import 'process/browser';

// Make Buffer and process available globally
window.Buffer = window.Buffer || require('buffer').Buffer;
window.process = require('process/browser');
