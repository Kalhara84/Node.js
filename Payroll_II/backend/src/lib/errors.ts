// Create validation errors that the administration error handler returns as HTTP 400.
// Throw a 400 Bad Request error (caught by the administration error handler)
export function fail(message: string): never {
    
    // Attach status 400 so the route error handler can show this message.
    throw Object.assign(
        new Error(message), 
        { status: 400 }
    );
    
}
