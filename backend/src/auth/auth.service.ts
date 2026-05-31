import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) {}

    async register(email: string, password: string) {
        const existingUser = await this.userService.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('Un compte existe deja avec cet email');
        }

        const user = await this.userService.create(email, password);
        const accessToken = await this.signToken(user.id, user.email);

        return {
            user: {
                id: user.id,
                email: user.email,
            },
            accessToken,
        };
    }

    async login(email: string, password: string) {
        const user = await this.userService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Identifiants invalides');
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
            throw new UnauthorizedException('Identifiants invalides');
        }

        const accessToken = await this.signToken(user.id, user.email);

        return {
            accessToken,
        };
    }

    private async signToken(userId: string, email: string) {
        return this.jwtService.signAsync(
            {
                sub: userId,
                email,
            },
            {
                algorithm: 'HS256',
            },
        );
    }
}

