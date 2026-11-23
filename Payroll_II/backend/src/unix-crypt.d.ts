// Tell TypeScript how the imported legacy password library is called.
declare module 'unix-crypt-td-js' {
    function crypt(password: string | number[], salt: string): string;
    export = crypt;
}
