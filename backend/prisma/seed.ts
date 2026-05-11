import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function sign(data: object): string {
    const privateKey = process.env.ECDSA_PRIVATE_KEY!.replace(/\\n/g, '\n');
    const payload = JSON.stringify(data);
    const sign = crypto.createSign('SHA256');
    sign.update(payload);
    sign.end();
    return sign.sign(privateKey, 'base64');
}

const watches = [
    {
        name: 'Submariner Date',
        brand: 'Rolex',
        model: 'Submariner',
        reference: '126610LN',
        ownerId: 'julien-castro',
    },
    {
        name: 'Royal Oak',
        brand: 'Audemars Piguet',
        model: 'Royal Oak',
        reference: '15510ST.OO.1320ST.06',
        ownerId: 'julien-castro',
    },
    {
        name: 'Nautilus',
        brand: 'Patek Philippe',
        model: 'Nautilus',
        reference: '5711/1A-010',
        ownerId: 'julien-castro',
    },
    {
        name: 'Speedmaster Moonwatch',
        brand: 'Omega',
        model: 'Speedmaster',
        reference: '310.30.42.50.01.001',
        ownerId: 'julien-castro',
    },
    {
        name: 'Carrera Chronograph',
        brand: 'TAG Heuer',
        model: 'Carrera',
        reference: 'CBN2A1B.FC6492',
        ownerId: 'julien-castro',
    },
];

async function main() {
    console.log('🌱 Seeding database...');

    for (const watch of watches) {
        const integrityHash = sign({
            brand: watch.brand,
            model: watch.model,
            reference: watch.reference,
            ownerId: watch.ownerId,
        });

        const asset = await prisma.asset.create({
            data: {
                ...watch,
                integrityHash,
            },
        });

        console.log(`✅ ${asset.brand} ${asset.model} — ${asset.reference}`);
    }

    console.log('🎉 Seed terminé !');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());