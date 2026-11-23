// Throw a 400 Bad Request error (caught by the administration error handler)
export function fail(message: string): never {
    
    throw Object.assign(
        new Error(message), 
        { status: 400 }
    );
    
}
