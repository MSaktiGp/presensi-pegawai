const fs = require('fs');
let data = fs.readFileSync('src/app/presensi/page.tsx', 'utf8');
data = data.replace(/if \(authLoading \|\| !isAuthorized\) \{\r?\n\s*const today = new Date\(\)/, `if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-gray-light)]">
        <div className="spinner !w-10 !h-10 mb-4" />
        <p className="text-[var(--text-secondary)] font-medium">Memuat data presensi...</p>
      </div>
    );
  }

  const today = new Date()`);
fs.writeFileSync('src/app/presensi/page.tsx', data);
console.log('Fixed page.tsx');
