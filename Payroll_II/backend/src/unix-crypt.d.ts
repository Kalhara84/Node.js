declare module 'unix-crypt-td-js' {
    function crypt(password: string | number[], salt: string): string;
    export = crypt;
}
