interface Greeting {
  message: string;
  timestamp: Date;
}

function createGreeting(message: string): Greeting {
  return {
    message,
    timestamp: new Date()
  };
}

const greeting: Greeting = createGreeting("Hello from TypeScript!");

console.log(greeting.message);
console.log(`Generated at: ${greeting.timestamp.toISOString()}`);