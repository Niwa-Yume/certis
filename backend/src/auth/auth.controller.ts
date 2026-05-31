import { Body, Controller, Post } from '@nestjs/common';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    register(@Body() dto: AuthCredentialsDto) {
        return this.authService.register(dto.email, dto.password);
    }

    @Post('login')
    login(@Body() dto: AuthCredentialsDto) {
        return this.authService.login(dto.email, dto.password);
    }
}

