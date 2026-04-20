import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    const asset = await prisma.asset.create({
        data: {
            name: 'Submariner Date',
            brand: 'Rolex',
            model: 'Submariner',
            reference: '126610LN',
            integrityHash: 'placeholder_hash',
            ownerId: 'owner-001',
        },
    });

    console.log('Asset créé :', asset);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());