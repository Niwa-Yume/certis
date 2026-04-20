import { Injectable } from '@nestjs/common';
import {CreateAssetDto} from "./dto/create-asset.dto";
import {PrismaService} from "../prisma/prisma.service";


@Injectable()
export class AssetService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateAssetDto) {
        return this.prisma.asset.create({
            data: {
                ...dto,
                integrityHash: 'placeholder',
            },
        });
    }

    async findAll() {
        return this.prisma.asset.findMany();
    }

    async findOne(id: string) {
        return this.prisma.asset.findUniqueOrThrow({
            where: { id },
        });
    }
}