#!/usr/bin/env node

/**
 * Stripe API Keys Verification Script
 * 
 * This script checks if your Stripe API keys are correctly configured
 */

require('dotenv').config({ path: '.env.local' });

const secretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

console.log('\n🔍 Checking Stripe API Keys Configuration...\n');

let hasErrors = false;

// Check Secret Key
console.log('1. Checking STRIPE_SECRET_KEY...');
if (!secretKey) {
  console.error('   ❌ STRIPE_SECRET_KEY is not set in .env.local');
  hasErrors = true;
} else if (secretKey.startsWith('sk_test_')) {
  console.log('   ✅ Valid test secret key format');
  console.log(`   📝 Key: ${secretKey.substring(0, 20)}...`);
} else if (secretKey.startsWith('sk_live_')) {
  console.log('   ✅ Valid live secret key format');
  console.log(`   📝 Key: ${secretKey.substring(0, 20)}...`);
} else if (secretKey.startsWith('pk_test_') || secretKey.startsWith('pk_live_')) {
  console.error('   ❌ ERROR: STRIPE_SECRET_KEY contains a PUBLISHABLE key!');
  console.error('   📝 Current value starts with: pk_test_ or pk_live_');
  console.error('   ⚠️  SECRET keys should start with: sk_test_ or sk_live_');
  console.error('   🔧 FIX: Swap STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in .env.local');
  hasErrors = true;
} else {
  console.error('   ❌ Invalid secret key format');
  console.error(`   📝 Current value: ${secretKey.substring(0, 20)}...`);
  console.error('   ⚠️  Should start with: sk_test_ or sk_live_');
  hasErrors = true;
}

// Check Publishable Key
console.log('\n2. Checking STRIPE_PUBLISHABLE_KEY...');
if (!publishableKey) {
  console.error('   ❌ STRIPE_PUBLISHABLE_KEY is not set in .env.local');
  hasErrors = true;
} else if (publishableKey.startsWith('pk_test_')) {
  console.log('   ✅ Valid test publishable key format');
  console.log(`   📝 Key: ${publishableKey.substring(0, 20)}...`);
} else if (publishableKey.startsWith('pk_live_')) {
  console.log('   ✅ Valid live publishable key format');
  console.log(`   📝 Key: ${publishableKey.substring(0, 20)}...`);
} else if (publishableKey.startsWith('sk_test_') || publishableKey.startsWith('sk_live_')) {
  console.error('   ❌ ERROR: STRIPE_PUBLISHABLE_KEY contains a SECRET key!');
  console.error('   📝 Current value starts with: sk_test_ or sk_live_');
  console.error('   ⚠️  PUBLISHABLE keys should start with: pk_test_ or pk_live_');
  console.error('   🔧 FIX: Swap STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in .env.local');
  hasErrors = true;
} else {
  console.error('   ❌ Invalid publishable key format');
  console.error(`   📝 Current value: ${publishableKey.substring(0, 20)}...`);
  console.error('   ⚠️  Should start with: pk_test_ or pk_live_');
  hasErrors = true;
}

// Final Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ Configuration Issues Found!\n');
  console.log('🔧 To fix:');
  console.log('   1. Open your .env.local file');
  console.log('   2. Make sure:');
  console.log('      STRIPE_SECRET_KEY=sk_test_51...');
  console.log('      STRIPE_PUBLISHABLE_KEY=pk_test_51...');
  console.log('   3. Restart your dev server: npm run dev\n');
  process.exit(1);
} else {
  console.log('✅ All Stripe API keys are correctly configured!\n');
  console.log('🚀 You can now:');
  console.log('   - Create products');
  console.log('   - Add prices');
  console.log('   - Create coupons');
  console.log('   - Use the Stripe admin portal\n');
  process.exit(0);
}
