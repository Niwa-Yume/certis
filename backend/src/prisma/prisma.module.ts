import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()// permet d'utiliser le service dans tout le projet sans avoir à l'importer dans chaque module
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {}