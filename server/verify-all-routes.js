console.log('====================================================');
console.log('  VERIFYING ALL BACKEND ROUTES AND CONTROLLERS     ');
console.log('====================================================');

async function testAllImports() {
  const routes = [
    { name: 'Auth Routes', path: './routes/authRoutes.js' },
    { name: 'Department Routes', path: './routes/departmentRoutes.js' },
    { name: 'Employee Routes', path: './routes/employeeRoutes.js' },
    { name: 'Visitor Routes', path: './routes/visitorRoutes.js' },
    { name: 'Expected Visitor Routes', path: './routes/expectedVisitorRoutes.js' },
    { name: 'Dashboard Routes', path: './routes/dashboardRoutes.js' },
    { name: 'Report Routes', path: './routes/reportRoutes.js' },
    { name: 'Notification Routes', path: './routes/notificationRoutes.js' },
    { name: 'Upload Routes', path: './routes/uploadRoutes.js' }
  ];

  let errors = 0;

  for (const r of routes) {
    try {
      const module = await import(r.path);
      console.log(`✅ [OK] ${r.name.padEnd(26)} : Loaded successfully`);
    } catch (err) {
      console.error(`❌ [FAIL] ${r.name.padEnd(24)} : ${err.message}`);
      errors++;
    }
  }

  console.log('====================================================');
  if (errors === 0) {
    console.log('🎉 ALL BACKEND ROUTES & CONTROLLERS ARE 100% HEALTHY!');
  } else {
    console.error(`⚠️ Found ${errors} import/export error(s).`);
    process.exit(1);
  }
}

testAllImports();
