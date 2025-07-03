function analyzeProjectFiles(fileList) {
    const files = fileList.map(f => f.trim()).filter(f => f.length > 0);
    let type = '';
    if (files.includes('package.json')) type = 'node';
    else if (files.includes('requirements.txt')) type = 'python';
    else if (files.includes('Dockerfile')) type = 'docker';

    // Deteksi file konfigurasi umum
    let configFiles = [];
    if (files.includes('.env.example') && !files.includes('.env')) {
        configFiles.push('.env');
    }
    if (files.includes('config.js')) configFiles.push('config.js');
    if (files.includes('config.json')) configFiles.push('config.json');
    if (files.includes('settings.py')) configFiles.push('settings.py');
    if (files.includes('settings.yaml')) configFiles.push('settings.yaml');

    const needConfig = configFiles.length > 0;

    return { type, needConfig, configFiles };
}

module.exports = { analyzeProjectFiles };
