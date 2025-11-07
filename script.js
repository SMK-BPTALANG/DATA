const STORAGE_KEY = 'rfid_offline_v3';
let store = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
if (!store.students)
  store.students = {
    "UID2163127274": { "nama": "ACMAD SAFIQ SAPUTRA", "kelas": "XI TKJ 1", "jurusan": "TKJ", "mapel": "", "gender": "L" },
    "UID2163020469": { "nama": "ARIFAL WAHYU RAMDANI", "kelas": "XI TKJ 1", "jurusan": "TKJ", "mapel": "", "gender": "L" },
    "UID2163106206": { "nama": "M.RIZKI AFDANI", "kelas": "XI TKJ 1", "jurusan": "TKJ", "mapel": "", "gender": "L" }
  };
if (!store.attendance) store.attendance = [];

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
function nowDate() { return new Date().toISOString().slice(0, 10); }
function nowTime() { return new Date().toTimeString().slice(0, 8); }
function genId() { return 'ID' + Date.now().toString(36); }

/* LOGIN */
function login() {
  const u = username.value.trim(), p = password.value.trim();
  if (u === 'admin' && p === '1234') {
    localStorage.setItem('rfid_login', '1');
    loginPage.classList.add('hidden');
    sidebar.classList.remove('hidden');
    absensiPage.classList.remove('hidden');
    absenDate.value = nowDate();
    focusRFID();
    updateClock(); renderAttendance();
  } else alert('Username atau password salah');
}
function logout() { localStorage.removeItem('rfid_login'); location.reload(); }

/* NAVIGASI */
let currentPage = 'absensi'; // halaman default

function showPage(id) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#absensiPage,#guruPage,#tuPage').forEach(e => e.classList.add('hidden'));
  const btns = document.querySelectorAll('.nav-btn');

  if (id === 'absensi') { btns[0].classList.add('active'); absensiPage.classList.remove('hidden'); }
  if (id === 'guru') { btns[1].classList.add('active'); guruPage.classList.remove('hidden'); }
  if (id === 'tu') { btns[2].classList.add('active'); tuPage.classList.remove('hidden'); }

  currentPage = id;
  updateExportButtons();
}

/* JAM REALTIME */
function updateClock() {
  setInterval(() => {
    clock.textContent = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' });
  }, 1000);
}

/* ======================== RFID & ABSENSI ======================== */
/* helper: fokus ke input RFID tersmbunyi */
function focusRFID() {
  const el = document.getElementById('rfidInput');
  if (el) {
    el.focus();
    // beberapa keyboard-emulating scanner butuh sedikit waktu untuk fokus
    setTimeout(() => el.selectionStart = el.selectionEnd = el.value.length, 50);
  }
}

/* set Mapel lalu kembalikan fokus ke RFID (agar scan tidak masuk ke mapel) */
function setMapelAndFocus() {
  const mapelEl = document.getElementById('absenMapel');
  if (!mapelEl.value.trim()) {
    alert('Isi Mata Pelajaran dulu sebelum klik Set Mapel & Fokus Scan.');
    mapelEl.focus();
    return;
  }
  // blur mapel dan fokus ke RFID tersembunyi
  mapelEl.blur();
  focusRFID();
  alert('Mapel disimpan. Silakan lakukan scan — UID akan masuk ke sistem tanpa terlihat di kolom Mapel.');
}

/* pastikan rfidInput selalu ter-handle */
const rfidInputEl = document.getElementById('rfidInput');
rfidInputEl?.addEventListener('change', e => {
  let uid = e.target.value.trim();
  if (uid) processUID(uid);
  e.target.value = '';
  // kembalikan fokus agar scanner berikutnya tetap diterima
  setTimeout(focusRFID, 100);
});

/* proses UID (tidak menimpa mapel, dll) */
function processUID(uid) {
  if (!uid.startsWith('UID')) uid = 'UID' + uid;
  const s = store.students[uid];
  if (!s) return alert('UID tidak terdaftar: ' + uid);

  const date = absenDate.value || nowDate();
  const mapel = absenMapel.value.trim();
  if (!mapel) {
    alert('Isi dulu kolom Mata Pelajaran sebelum scan!');
    absenMapel.focus();
    return;
  }

  const time = nowTime();

  // cek apakah sudah ada entri untuk UID + tanggal + mapel yang sama
  const exist = store.attendance.find(
    r => r.uid === uid && r.date === date && r.mapel?.toLowerCase() === mapel.toLowerCase()
  );

  if (exist) {
    exist.time = time;
    exist.ket = 'H';
  } else {
    // hapus record kosong sebelumnya untuk UID+tanggal
    store.attendance = store.attendance.filter(
      r => !(r.uid === uid && r.date === date && (!r.mapel || r.mapel.trim() === ""))
    );

    store.attendance.push({
      id: genId(),
      uid,
      nama: s.nama,
      kelas: s.kelas,
      mapel: mapel,
      date: date,
      time: time,
      ket: 'H',
      gender: s.gender
    });
  }

  save();
  renderAttendance();
  // tidak tampilkan UID di mapel; beri notifikasi singkat
  alert(`✅ Absen berhasil: ${s.nama} (${mapel})`);
}

/* manual add (untuk debugging) */
function manualAdd() {
  const uid = prompt('Masukkan UID (contoh 2163127274):');
  if (uid) processUID(uid);
}

/* ======================== TAMPILKAN TABEL ABSENSI ======================== */
function renderAttendance() {
  const date = absenDate.value || nowDate();
  const rows = store.attendance.filter(r => r.date === date);
  let html = `<table><thead><tr><th>No</th><th>UID</th><th>Nama</th><th>Gender</th><th>Kelas</th><th>Mapel</th><th>Jam</th><th>Keterangan</th></tr></thead><tbody>`;
  if (!rows.length) html += `<tr><td colspan="8">Belum ada data</td></tr>`;
  else rows.forEach((r, i) => {
    html += `<tr><td>${i + 1}</td><td>${r.uid}</td><td>${r.nama}</td><td>${r.gender}</td><td>${r.kelas}</td><td>${r.mapel}</td><td><b>${r.time}</b></td><td>${r.ket}</td></tr>`;
  });
  html += '</tbody></table>';
  absensiResult.innerHTML = html;
}

/* ======================== LAPORAN GURU ======================== */
function enableEditKeterangan() {
  document.querySelectorAll('.edit-ket').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const record = store.attendance.find(r => r.id === id);
      if (!record) return;
      const newKet = prompt('Ubah keterangan (H/I/S/A):', record.ket.toUpperCase());
      if (!['H', 'I', 'S', 'A'].includes(newKet)) {
        alert('Input harus H, I, S, atau A');
        return;
      }
      record.ket = newKet.toUpperCase();
      save();
      runGuruReport();
      alert('Keterangan berhasil diubah!');
    });
  });
}

function runGuruReport() {
  const tgl = guruDate.value, kelas = guruClass.value.trim();
  let rows = store.attendance;
  if (tgl) rows = rows.filter(r => r.date === tgl);
  if (kelas) rows = rows.filter(r => r.kelas.toLowerCase().includes(kelas.toLowerCase()));

  let html = `<table><thead><tr>
  <th>No</th><th>Tanggal</th><th>Nama</th><th>Kelas</th>
  <th>Mapel</th><th>Jam</th><th>Keterangan</th><th>Aksi</th>
  </tr></thead><tbody>`;

  if (!rows.length) html += `<tr><td colspan="8">Tidak ada data</td></tr>`;
  else rows.forEach((r, i) => {
    html += `<tr>
      <td>${i + 1}</td>
      <td>${r.date}</td>
      <td>${r.nama}</td>
      <td>${r.kelas}</td>
      <td>${r.mapel}</td>
      <td>${r.time}</td>
      <td>${r.ket}</td>
      <td><button class="edit-ket" data-id="${r.id}">✏️</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  guruResult.innerHTML = html;
  enableEditKeterangan();
}

/* ======================== REKAP TU ======================== */
function runTUReport() {
  const tgl = tuDate.value, kelas = tuClass.value.trim(), ket = tuKet.value;
  let rows = store.attendance;
  if (tgl) rows = rows.filter(r => r.date === tgl);
  if (kelas) rows = rows.filter(r => r.kelas.toLowerCase().includes(kelas.toLowerCase()));
  if (ket) rows = rows.filter(r => r.ket === ket);

  let html = `<table><thead><tr><th>No</th><th>Tanggal</th><th>Nama</th><th>Kelas</th><th>Mapel</th><th>Jam</th><th>Keterangan</th></tr></thead><tbody>`;
  if (!rows.length) html += `<tr><td colspan="7">Tidak ada data</td></tr>`;
  else rows.forEach((r, i) => {
    html += `<tr><td>${i + 1}</td><td>${r.date}</td><td>${r.nama}</td><td>${r.kelas}</td><td>${r.mapel}</td><td>${r.time}</td><td>${r.ket}</td></tr>`;
  });
  html += '</tbody></table>';
  tuResult.innerHTML = html;
}

/* ======================== EXPORT ======================== */
function exportCSV(page) {
  let table;
  if (page === 'guru') table = document.querySelector('#guruResult table');
  else if (page === 'tu') table = document.querySelector('#tuResult table');
  else return alert('Tombol export hanya bisa di Laporan Guru atau Rekapan TU');

  if (!table) { alert('Tidak ada data untuk diexport.'); return; }

  let csv = '';
  table.querySelectorAll('tr').forEach(tr => {
    const row = [...tr.children].map(td => `"${td.innerText}"`).join(',');
    csv += row + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${page}_report.csv`;
  a.click();
}

function exportPDF(page) {
  let table;
  if (page === 'guru') table = document.querySelector('#guruResult').innerHTML;
  else if (page === 'tu') table = document.querySelector('#tuResult').innerHTML;
  else return alert('Tombol export hanya bisa di Laporan Guru atau Rekapan TU');

  if (!table || table.includes('Tidak ada data')) {
    alert('Tidak ada data untuk diexport.');
    return;
  }

  const win = window.open('', '_blank');
  win.document.write(`
    <html>
      <head>
        <title>Export PDF - ${page}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #999; padding: 6px; font-size: 12px; }
          th { background: #0fa79a; color: white; }
        </style>
      </head>
      <body>
        <h3>Laporan ${page === 'guru' ? 'Guru' : 'Rekapan TU'}</h3>
        ${table}
      </body>
    </html>
  `);
  win.document.close();
  win.print();
}

/* PRINT (rapikan preview cetak: tampilkan hanya area laporan yang dipilih) */
function printReport(page) {
  // tambahkan class pada body agar CSS print menampilkan area yang tepat
  if (page === 'guru') document.body.classList.add('print-guru');
  else if (page === 'tu') document.body.classList.add('print-tu');
  else { alert('Gunakan tombol Cetak di Laporan Guru atau Rekapan TU'); return; }

  // panggil print lalu hapus kelas setelah selesai
  window.print();
  window.onafterprint = () => {
    document.body.classList.remove('print-guru');
    document.body.classList.remove('print-tu');
    window.onafterprint = null;
  };
}

/* ======================== EXPORT BUTTONS ======================== */
function updateExportButtons() {
  const disable = (currentPage !== 'guru' && currentPage !== 'tu');
  ['btnPdf', 'btnCsv', 'btnPrint'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = disable;
      el.style.opacity = disable ? '0.5' : '1';
      el.style.cursor = disable ? 'not-allowed' : 'pointer';
    }
  });
}

/* INIT */
window.onload = () => {
  if (localStorage.getItem('rfid_login') === '1') {
    loginPage.classList.add('hidden');
    sidebar.classList.remove('hidden');
    absensiPage.classList.remove('hidden');
    absenDate.value = nowDate();
    focusRFID();
    updateClock();
    renderAttendance();
  } else {
    loginPage.classList.remove('hidden');
    sidebar.classList.add('hidden');
  }

  // jika user klik area utama, pastikan fokus kembali ke RFID (mempermudah scan)
  document.addEventListener('click', (e) => {
    // jangan ganggu jika user sedang mengetik di Mapel
    if (document.activeElement && document.activeElement.id === 'absenMapel') return;
    focusRFID();
  });
};
