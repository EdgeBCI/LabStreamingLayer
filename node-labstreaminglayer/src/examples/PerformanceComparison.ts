/**
 * Example: Performance comparison between pushSample and pushChunk
 * 
 * This example demonstrates the performance difference between sending
 * individual samples vs. sending chunks of samples.
 */

import { 
  StreamInfo, 
  StreamOutlet, 
  StreamInlet,
  localClock,
  cf_float32
} from '../index.js';

async function testSamplePerformance(numSamples: number, numChannels: number): Promise<number> {
  const info = new StreamInfo('PerfTestSample', 'Benchmark', numChannels, 1000, cf_float32);
  const outlet = new StreamOutlet(info);
  const inlet = new StreamInlet(info);
  
  inlet.openStream(1.0);
  
  // Generate test data
  const sample = new Array(numChannels).fill(0).map(() => Math.random());
  
  // Measure push time
  const startPush = localClock();
  for (let i = 0; i < numSamples; i++) {
    outlet.pushSample(sample);
  }
  const pushTime = localClock() - startPush;
  
  // Allow data to transmit
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Measure pull time
  const startPull = localClock();
  let received = 0;
  while (received < numSamples) {
    const [s] = inlet.pullSample(0.01);
    if (s) received++;
    if (localClock() - startPull > 5.0) break; // Timeout protection
  }
  const pullTime = localClock() - startPull;
  
  outlet.destroy();
  inlet.destroy();
  info.destroy();
  
  return pushTime + pullTime;
}

async function testChunkPerformance(
  numSamples: number, 
  numChannels: number, 
  chunkSize: number
): Promise<number> {
  const info = new StreamInfo('PerfTestChunk', 'Benchmark', numChannels, 1000, cf_float32);
  const outlet = new StreamOutlet(info, chunkSize);
  const inlet = new StreamInlet(info, 360, chunkSize);
  
  inlet.openStream(1.0);
  
  // Generate test data
  const chunk: number[][] = [];
  for (let i = 0; i < chunkSize; i++) {
    chunk.push(new Array(numChannels).fill(0).map(() => Math.random()));
  }
  
  // Measure push time
  const numChunks = Math.floor(numSamples / chunkSize);
  const startPush = localClock();
  for (let i = 0; i < numChunks; i++) {
    outlet.pushChunk(chunk);
  }
  const pushTime = localClock() - startPush;
  
  // Allow data to transmit
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Measure pull time
  const startPull = localClock();
  let received = 0;
  while (received < numSamples) {
    const [samples] = inlet.pullChunk(0.01, chunkSize * 2);
    if (samples) received += samples.length;
    if (localClock() - startPull > 5.0) break; // Timeout protection
  }
  const pullTime = localClock() - startPull;
  
  outlet.destroy();
  inlet.destroy();
  info.destroy();
  
  return pushTime + pullTime;
}

async function main() {
  console.log('LSL Performance Comparison: pushSample vs pushChunk');
  console.log('====================================================\n');
  
  const configurations = [
    { channels: 8, samples: 1000, chunkSizes: [10, 25, 50, 100] },
    { channels: 32, samples: 1000, chunkSizes: [10, 25, 50, 100] },
    { channels: 64, samples: 500, chunkSizes: [10, 25, 50] },
  ];
  
  for (const config of configurations) {
    console.log(`\nConfiguration: ${config.channels} channels, ${config.samples} samples`);
    console.log('─'.repeat(60));
    
    // Test individual samples
    console.log('\nTesting individual samples...');
    const sampleTime = await testSamplePerformance(config.samples, config.channels);
    const sampleThroughput = config.samples / sampleTime;
    
    console.log(`  Time: ${(sampleTime * 1000).toFixed(2)}ms`);
    console.log(`  Throughput: ${sampleThroughput.toFixed(0)} samples/sec`);
    console.log(`  Per-sample overhead: ${(sampleTime / config.samples * 1000000).toFixed(2)}µs`);
    
    // Test different chunk sizes
    console.log('\nTesting chunks:');
    const results: Array<{size: number, time: number, throughput: number}> = [];
    
    for (const chunkSize of config.chunkSizes) {
      process.stdout.write(`  Chunk size ${chunkSize}... `);
      const chunkTime = await testChunkPerformance(config.samples, config.channels, chunkSize);
      const chunkThroughput = config.samples / chunkTime;
      const improvement = ((chunkThroughput / sampleThroughput - 1) * 100);
      
      results.push({ size: chunkSize, time: chunkTime, throughput: chunkThroughput });
      
      console.log(`${(chunkTime * 1000).toFixed(2)}ms (${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% vs samples)`);
    }
    
    // Find optimal chunk size
    const optimal = results.reduce((best, current) => 
      current.throughput > best.throughput ? current : best
    );
    
    console.log(`\n  ✓ Optimal chunk size: ${optimal.size} samples`);
    console.log(`    Best throughput: ${optimal.throughput.toFixed(0)} samples/sec`);
    console.log(`    Improvement over individual: ${((optimal.throughput / sampleThroughput - 1) * 100).toFixed(1)}%`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Performance Summary:');
  console.log('- Chunks are significantly faster than individual samples');
  console.log('- Optimal chunk size depends on channel count and latency requirements');
  console.log('- Larger chunks improve throughput but increase latency');
  console.log('- For real-time applications, balance chunk size with latency needs');
  
  process.exit(0);
}

// Run the benchmark
console.log('Starting performance comparison...');
console.log('This may take a minute to complete.\n');

main().catch(error => {
  console.error('Error during benchmark:', error);
  process.exit(1);
});