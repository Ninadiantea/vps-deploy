const { Client } = require('ssh2');
const { analyzeProjectFiles } = require('./utils');

function runSSHCommand(conn, command) {
    return new Promise((resolve, reject) => {
        conn.exec(command, (err, stream) => {
            if (err) return reject(err);
            let data = '';
            stream.on('close', (code, signal) => resolve(data))
                .on('data', (chunk) => data += chunk.toString())
                .stderr.on('data', (chunk) => data += chunk.toString());
        });
    });
}

async function deployToVPS({ ip, username, password, repo }) {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', async () => {
            try {
                const folder = `deploy_${Math.floor(Math.random() * 100000)}`;
                await runSSHCommand(conn, `rm -rf ~/${folder} && git clone ${repo} ~/${folder}`);
                const fileList = await runSSHCommand(conn, `ls ~/${folder}`);
                const analysis = analyzeProjectFiles(fileList.split('\n'));

                let installCmd = '';
                let runCmd = '';
                let configInfo = '';

                // Deteksi dependency & perintah install/run
                if (analysis.type === 'node') {
                    installCmd = `cd ~/${folder} && apt-get update && apt-get install -y nodejs npm && npm install`;
                    runCmd = `cd ~/${folder} && npm run build || true && npm start &`;
                } else if (analysis.type === 'python') {
                    installCmd = `cd ~/${folder} && apt-get update && apt-get install -y python3 python3-pip && pip3 install -r requirements.txt`;
                    runCmd = `cd ~/${folder} && python3 main.py &`;
                } else if (analysis.type === 'docker') {
                    installCmd = `cd ~/${folder} && apt-get update && apt-get install -y docker.io && docker build -t myapp .`;
                    runCmd = `cd ~/${folder} && docker run -d -p 3000:3000 myapp`;
                } else {
                    installCmd = '';
                    runCmd = '';
                }

                // Eksekusi install dan run
                if (installCmd) await runSSHCommand(conn, installCmd);
                if (runCmd) await runSSHCommand(conn, runCmd);

                // Deteksi file konfigurasi
                if (analysis.needConfig) {
                    configInfo = `⚙️ *Ditemukan file konfigurasi yang perlu diisi:*\n${analysis.configFiles.map(f=>`- \`${f}\``).join('\n')}\n\n📝 *Silakan edit file tersebut di VPS agar aplikasi berjalan dengan benar!*`;
                }

                let msg = '';
                if (analysis.type === 'node') {
                    msg = `✅ *Deploy sukses!*\n\n📦 *Terdeteksi project Node.js.*\n🌐 *Akses:* \`http://${ip}:3000\`\n\n⚠️ *Edit file .env jika perlu konfigurasi tambahan.*`;
                } else if (analysis.type === 'python') {
                    msg = `✅ *Deploy sukses!*\n\n📦 *Terdeteksi project Python.*\n🌐 *Akses:* \`http://${ip}:8000\` *atau port sesuai project*\n\n⚠️ *Edit file konfigurasi jika perlu.*`;
                } else if (analysis.type === 'docker') {
                    msg = `✅ *Deploy sukses!*\n\n📦 *Terdeteksi project Docker.*\n🌐 *Akses:* \`http://${ip}:3000\`\n\n⚠️ *Gunakan port sesuai project.*`;
                } else {
                    msg = `✅ *Deploy selesai.*\n\nℹ️ *Namun, jenis project tidak terdeteksi otomatis. Silakan cek manual di VPS.*`;
                }

                conn.end();
                resolve({ message: msg, configInfo });
            } catch (e) {
                conn.end();
                reject(e);
            }
        }).connect({ host: ip, port: 22, username, password });
    });
}

module.exports = { deployToVPS };
