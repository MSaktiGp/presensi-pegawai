import bcrypt from 'bcryptjs';

const generateHash = async () => {
  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('\nGunakan hash di atas untuk file seed_pegawai.sql');
};

generateHash();
