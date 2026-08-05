import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testStorage() {
  console.log('🔌 Testing Supabase Storage connection...\n');

  // 1. Test: list buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('❌ Gagal mengambil daftar bucket:', bucketsError.message);
    return;
  }
  console.log('✅ Koneksi Supabase berhasil!');
  console.log(`📦 Bucket tersedia: ${buckets.map(b => b.name).join(', ')}\n`);

  // 2. Test: upload a small test file
  const testBuffer = Buffer.from('test photo upload', 'utf-8');
  const testPath = 'test/connection-test.txt';

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('attendance-photos')
    .upload(testPath, testBuffer, {
      contentType: 'text/plain',
      upsert: true,
    });

  if (uploadError) {
    console.error('❌ Gagal upload file tes:', uploadError.message);
    return;
  }
  console.log('✅ Upload file tes berhasil!');

  // 3. Test: get public URL
  const { data: urlData } = supabase.storage
    .from('attendance-photos')
    .getPublicUrl(testPath);

  console.log(`🔗 Public URL: ${urlData.publicUrl}`);

  // 4. Cleanup: delete test file
  const { error: deleteError } = await supabase.storage
    .from('attendance-photos')
    .remove([testPath]);

  if (!deleteError) {
    console.log('🧹 File tes berhasil dihapus.');
  }

  console.log('\n🎉 Supabase Storage siap digunakan!');
}

testStorage().catch(console.error);
