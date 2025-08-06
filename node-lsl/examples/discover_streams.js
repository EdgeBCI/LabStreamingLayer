/**
 * Example: Discovering LSL streams on the network
 * This example shows different ways to find and monitor streams
 */

const lsl = require('../dist');

console.log('LSL Library Information:');
console.log('  Protocol version:', lsl.protocolVersion());
console.log('  Library version:', lsl.libraryVersion());
console.log('  Library info:', lsl.libraryInfo());
console.log('  Local clock:', lsl.localClock());
console.log();

// Method 1: Resolve all streams
console.log('Method 1: Discovering all streams (waiting 2 seconds)...');
const allStreams = lsl.resolveStreams(2.0);

if (allStreams.length === 0) {
  console.log('No streams found on the network.');
} else {
  console.log(`Found ${allStreams.length} stream(s):\n`);
  
  allStreams.forEach((stream, index) => {
    console.log(`Stream ${index + 1}:`);
    console.log('  Name:', stream.name());
    console.log('  Type:', stream.type());
    console.log('  Channels:', stream.channelCount());
    console.log('  Sampling rate:', stream.nominalSrate(), 'Hz');
    console.log('  Format:', stream.channelFormatString());
    console.log('  Source ID:', stream.sourceId());
    console.log('  Hostname:', stream.hostname());
    console.log('  Created at:', new Date(stream.createdAt() * 1000).toISOString());
    console.log();
  });
}

// Method 2: Find specific stream types
console.log('Method 2: Looking for specific stream types...\n');

const streamTypes = ['EEG', 'ECG', 'EMG', 'Markers', 'Audio'];

streamTypes.forEach(type => {
  const streams = lsl.findStreamsByType(type, 0.5);
  if (streams.length > 0) {
    console.log(`Found ${streams.length} ${type} stream(s)`);
  }
});

console.log();

// Method 3: Continuous resolver
console.log('Method 3: Continuous monitoring (10 seconds)...');
console.log('Start/stop streams to see them appear/disappear\n');

// Create a continuous resolver for all streams
const resolver = new lsl.ContinuousResolver(undefined, undefined, undefined, 5.0);

let lastStreamCount = 0;
const checkInterval = setInterval(() => {
  const streams = resolver.results();
  
  if (streams.length !== lastStreamCount) {
    console.log(`Stream count changed: ${lastStreamCount} -> ${streams.length}`);
    
    if (streams.length > 0) {
      console.log('Current streams:');
      streams.forEach(stream => {
        console.log(`  - ${stream.name()} (${stream.type()})`);
      });
    }
    
    lastStreamCount = streams.length;
  }
}, 500); // Check every 500ms

// Stop after 10 seconds
setTimeout(() => {
  clearInterval(checkInterval);
  resolver.destroy();
  
  console.log('\nMonitoring stopped.');
  demonstratePredicateSearch();
}, 10000);

// Method 4: Advanced search with predicates
function demonstratePredicateSearch() {
  console.log('\nMethod 4: Advanced search with XPath predicates...');
  
  // Example predicates
  const predicates = [
    "name='DummyEEG'",
    "type='EEG' and channel_count='8'",
    "channel_format='float32'",
  ];
  
  predicates.forEach(predicate => {
    console.log(`\nSearching with predicate: "${predicate}"`);
    try {
      const streams = lsl.resolveByPred(predicate, 0, 1.0);
      if (streams.length > 0) {
        console.log(`  Found ${streams.length} matching stream(s)`);
        streams.forEach(stream => {
          console.log(`    - ${stream.name()} (${stream.type()})`);
        });
      } else {
        console.log('  No matching streams found');
      }
    } catch (error) {
      console.log('  Error:', error.message);
    }
  });
  
  console.log('\nDiscovery example complete!');
  process.exit(0);
}