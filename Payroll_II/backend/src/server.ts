import app from './app';


let port = 3001;

if (process.env.PORT && process.env.PORT.trim() !== '') {
    port = Number(process.env.PORT);
}

if (!Number.isInteger(port) || port < 0 || port >= 65536) {
    throw new Error('PORT must be a whole number between 0 and 65535.');
}


app.listen(port, () => {
    return console.log(`Payroll API running on http://localhost:${port}`);
});
