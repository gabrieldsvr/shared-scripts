#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Caminho do projeto que está executando o script
const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const envPath = path.join(rootDir, '.env');

console.log('[SHARED] Carregando .env do caminho:', envPath);
dotenv.config({ path: envPath });

console.log('[SHARED] Baixando arquivos de configuração do S3...');
validateEnv();

// ✅ Removido o segundo const BUCKET
const BUCKET = process.env.BUCKET;
console.log(`[SHARED] Usando o bucket: ${BUCKET}`);
if (!BUCKET) {
    console.error('❌ BUCKET não está definido.');
    process.exit(1);
}

const AWS_FILES_RAW = process.env.AWS_FILES;
if (!AWS_FILES_RAW) {
    console.error('❌ AWS_FILES não está definido.');
    process.exit(1);
}

let AWS_FILES;
try {
    AWS_FILES = JSON.parse(AWS_FILES_RAW);
} catch (err) {
    console.error('❌ AWS_FILES contém JSON inválido.');
    process.exit(1);
}

console.log(`[SHARED] Arquivos a serem baixados: ${JSON.stringify(AWS_FILES, null, 2)}`);
downloadS3Files().then(() => {
    console.log('[SHARED] ✅ Todos os arquivos foram baixados com sucesso.');
}).catch(error => {
    console.error('[SHARED] ❌ Erro ao preparar os arquivos:', error);
    process.exit(1);
});

async function downloadS3Files() {
    for (const awsFile of AWS_FILES) {
        const s3Key = Object.keys(awsFile)[0];
        const localPath = awsFile[s3Key];
        const fileUrl = `https://${BUCKET}.s3.sa-east-1.amazonaws.com/${s3Key}`;

        try {
            const response = await fetch(fileUrl);
            if (!response.ok) {
                console.error(`[SHARED] ❌ Erro ao baixar ${s3Key}: ${response.status} ${response.statusText}`);
                continue;
            }

            const content = await response.text();
            const fullPath = path.join(rootDir, localPath);
            const dirPath = path.dirname(fullPath);

            if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

            fs.writeFileSync(fullPath, content);
            console.log(`[SHARED] 📁 Arquivo ${localPath} salvo em ${fullPath}`);
        } catch (error) {
            console.error(`[SHARED] ❌ Erro ao processar ${s3Key}:`, error);
        }
    }
}

function validateEnv() {
    if (!process.env.BUCKET) {
        console.error('[SHARED] ❌ BUCKET não definido no .env');
        process.exit(1);
    }

    if (!process.env.AWS_FILES) {
        console.error('[SHARED] ❌ AWS_FILES não definido no .env');
        process.exit(1);
    }

    try {
        JSON.parse(process.env.AWS_FILES);
    } catch {
        console.error('[SHARED] ❌ AWS_FILES não contém JSON válido');
        process.exit(1);
    }
}
