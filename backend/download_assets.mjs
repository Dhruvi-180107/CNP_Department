import fs from 'fs';
import path from 'path';
import https from 'https';

const ASSETS_DIR = path.join(process.cwd(), 'seed-assets');
const DIRS = ['profiles', 'clubs', 'projects', 'materials', 'documents'];

// Ensure directories exist
DIRS.forEach(dir => {
  const dirPath = path.join(ASSETS_DIR, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      } else if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

const profiles = [
  { name: 'Arjun Mehta', file: 'arjun-mehta.jpg' },
  { name: 'Riya Sharma', file: 'riya-sharma.jpg' },
  { name: 'Kabir Patel', file: 'kabir-patel.jpg' },
  { name: 'Ananya Singh', file: 'ananya-singh.jpg' },
  { name: 'Neha Verma', file: 'neha-verma.jpg' },
  { name: 'Rahul Desai', file: 'rahul-desai.jpg' },
  { name: 'Amit Joshi', file: 'amit-joshi.jpg' },
  { name: 'Priya Nair', file: 'priya-nair.jpg' },
  { name: 'Karan Shah', file: 'karan-shah.jpg' },
  { name: 'Vivek Malhotra', file: 'vivek-malhotra.jpg' },
];

const clubs = [
  { text: 'Robotics+Club', file: 'robotics-club.jpg', color: 'FF5733' },
  { text: 'Coding+Club', file: 'coding-club.jpg', color: '3357FF' },
  { text: 'Photography+Club', file: 'photography-club.jpg', color: 'FF33A8' },
];

const projects = [
  { text: 'Smart+Irrigation', file: 'smart-irrigation.jpg', color: '4CAF50' },
  { text: 'Autonomous+Rover', file: 'autonomous-rover.jpg', color: 'FF9800' },
  { text: 'Campus+Energy', file: 'campus-energy.jpg', color: '2196F3' },
];

const materials = [
  { text: 'Soil+Moisture+Sensor', file: 'soil-moisture-sensor.jpg', color: '795548' },
  { text: 'Ultrasonic+Sensor', file: 'ultrasonic-sensor.jpg', color: '607D8B' },
  { text: 'Arduino+Uno', file: 'arduino-uno.jpg', color: '009688' },
  { text: 'Jumper+Wires', file: 'jumper-wires.jpg', color: 'E91E63' },
];

async function run() {
  console.log('Downloading profiles...');
  for (const p of profiles) {
    const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&size=256&background=random&format=jpg`;
    await downloadFile(url, path.join(ASSETS_DIR, 'profiles', p.file));
  }

  console.log('Downloading clubs...');
  for (const c of clubs) {
    const url = `https://placehold.co/400x400/${c.color}/FFF/jpg?text=${c.text}`;
    await downloadFile(url, path.join(ASSETS_DIR, 'clubs', c.file));
  }

  console.log('Downloading projects...');
  for (const p of projects) {
    const url = `https://placehold.co/600x400/${p.color}/FFF/jpg?text=${p.text}`;
    await downloadFile(url, path.join(ASSETS_DIR, 'projects', p.file));
  }

  console.log('Downloading materials...');
  for (const m of materials) {
    const url = `https://placehold.co/400x400/${m.color}/FFF/jpg?text=${m.text}`;
    await downloadFile(url, path.join(ASSETS_DIR, 'materials', m.file));
  }

  console.log('Generating dummy PDF documents...');
  const docs = ['smart-irrigation-update.pdf', 'autonomous-rover-update.pdf', 'campus-energy-update.pdf'];
  for (const d of docs) {
    fs.writeFileSync(path.join(ASSETS_DIR, 'documents', d), '%PDF-1.4\n% Dummy PDF content for ' + d);
  }

  console.log('Assets downloaded and generated.');
}

run().catch(console.error);
