import app from './app';

// Default port number
let port = 3001;

// Use PORT from environment if specified
if (process.env.PORT && process.env.PORT.trim() !== '') {
    port = Number(process.env.PORT);
}

// Validate port range
if (!Number.isInteger(port) || port < 0 || port >= 65536) {
    throw new Error('PORT must be a whole number between 0 and 65535.');
}

// Start HTTP server
app.listen(port, () => {
    console.log(`Payroll API running on http://localhost:${port}`);
});
