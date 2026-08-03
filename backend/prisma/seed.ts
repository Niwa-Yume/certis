import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const users = [
    {
        id: 'julien-castro',
        email: 'julien.castro@certis.local',
        // Hash bcrypt factice pour un compte seed (mot de passe: ChangeMe123!)
        passwordHash: '$2b$10$K6N7A7X1oPCd2A8nQj2uue0mRs73nA8v6SfoZWXx85n6dIG6J5aQe',
    },
    {
        id: 'certis-pro',
        email: 'certis@pro.com',
        plainPassword: '1234567',
    },
];

const watches: Array<{ name: string; brand: string; model: string; reference: string; ownerKey: string }> = [
    { name: 'Submariner Date', brand: 'Rolex', model: 'Submariner', reference: '126610LN', ownerKey: 'julien-castro' },
    { name: 'Royal Oak', brand: 'Audemars Piguet', model: 'Royal Oak', reference: '15510ST.OO.1320ST.06', ownerKey: 'julien-castro' },
    { name: 'Nautilus', brand: 'Patek Philippe', model: 'Nautilus', reference: '5711/1A-010', ownerKey: 'julien-castro' },
    { name: 'Speedmaster Moonwatch', brand: 'Omega', model: 'Speedmaster', reference: '310.30.42.50.01.001', ownerKey: 'julien-castro' },
    { name: 'Carrera Chronograph', brand: 'TAG Heuer', model: 'Carrera', reference: 'CBN2A1B.FC6492', ownerKey: 'julien-castro' },
    // Montres de certis@pro.com
    { name: 'Daytona Cosmograph', brand: 'Rolex', model: 'Daytona', reference: '116500LN', ownerKey: 'certis-pro' },
    { name: 'Aquanaut', brand: 'Patek Philippe', model: 'Aquanaut', reference: '5167A-001', ownerKey: 'certis-pro' },
    { name: 'Seamaster 300M', brand: 'Omega', model: 'Seamaster', reference: '210.30.42.20.01.001', ownerKey: 'certis-pro' },
    { name: 'Lange 1', brand: 'A. Lange & Söhne', model: 'Lange 1', reference: '191.032', ownerKey: 'certis-pro' },
];

function sign(data: object): string {
    const privateKey = process.env.ECDSA_PRIVATE_KEY!.replace(/\\n/g, '\n');
    const payload = JSON.stringify(data);
    const s = crypto.createSign('SHA256');
    s.update(payload);
    s.end();
    return s.sign(privateKey, 'base64');
}

async function main() {
    console.log('🌱 Seeding database...');

    // Nettoyage dans l'ordre des dépendances
    await prisma.$transaction([
        prisma.transfer.deleteMany(),
        prisma.authNonce.deleteMany(),
        prisma.asset.deleteMany(),
        prisma.user.deleteMany(),
    ]);

    // Création des utilisateurs
    const createdUsers: Record<string, string> = {};
    for (const u of users) {
        const passwordHash = u.passwordHash ?? await bcrypt.hash(u.plainPassword!, 10);
        const user = await prisma.user.create({
            data: { id: u.id, email: u.email, passwordHash },
        });
        createdUsers[u.id] = user.id;
        console.log(`👤 User: ${user.email}`);
    }

    // Création des montres
    for (const watch of watches) {
        const ownerId = createdUsers[watch.ownerKey];
        const { ownerKey, ...watchData } = watch;
        const integrityHash = sign({ brand: watchData.brand, model: watchData.model, reference: watchData.reference, ownerId });
        const asset = await prisma.asset.create({ data: { ...watchData, ownerId, integrityHash } });
        console.log(`⌚ ${asset.brand} ${asset.model} → ${watch.ownerKey}`);
    }

    console.log('🎉 Seed terminé !');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());