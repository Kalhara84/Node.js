import app from './app';


const port = parseInt(process.env.PORT || '3001', 10);


app.listen(port, () => {
    return console.log(`Payroll API running on http://localhost:${port}`);
});
