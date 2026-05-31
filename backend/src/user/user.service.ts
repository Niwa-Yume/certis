import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async create(email: string, plainPassword: string) {
        const passwordHash = await bcrypt.hash(plainPassword, 10);

        return this.prisma.user.create({
            data: {
                email,
                passwordHash,
            },
        });
    }
}

